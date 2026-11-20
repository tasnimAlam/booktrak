import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "./app.ts";
import type { Db } from "./plugins/db.ts";
import { hashPassword } from "./password.ts";

const fakeDb = (query: (sql: string, params: unknown[]) => Promise<unknown>) =>
  ({ query }) as unknown as Db;
const jwtSecret = "test-secret-at-least-32-characters-long";
const build = (db: Db, opts = {}) => buildApp(db, { jwtSecret, ...opts });

// A signed token for book routes, which require auth.
async function authHeader(app: ReturnType<typeof build>) {
  await app.ready();
  return { authorization: `Bearer ${app.jwt.sign({ sub: "1", role: "reader" })}` };
}

test("GET /api/books returns rows and drops unknown columns", async () => {
  const row = {
    id: 1,
    title: "Dune",
    author: "Frank Herbert",
    isbn: null,
    page_count: 612,
    published_on: "1965-08-01",
    description: null,
    metadata: { genres: ["sci-fi"] },
    password_hash: "leak",
  };
  const app = build(fakeDb(async () => ({ rows: [row] })));

  const res = await app.inject({ method: "GET", url: "/api/books", headers: await authHeader(app) });

  assert.equal(res.statusCode, 200);
  const [book] = res.json();
  assert.equal(book.title, "Dune");
  assert.equal(book.published_on, "1965-08-01");
  assert.ok(!("password_hash" in book));
  await app.close();
});

test("GET /api/books passes filters to SQL as parameters", async () => {
  let params: unknown[] = [];
  const db = {
    query: async (_sql: string, p: unknown[]) => {
      params = p;
      return { rows: [] };
    },
  } as unknown as Db;
  const app = build(db);

  const headers = await authHeader(app);
  const res = await app.inject({
    method: "GET",
    url: "/api/books?author=Ana&author=Ben&minPages=200&genre=fantasy",
    headers,
  });
  assert.equal(res.statusCode, 200);
  // [authors, minPages, maxPages, genres]; a single genre is coerced to an array.
  assert.deepEqual(params, [["Ana", "Ben"], 200, null, ["fantasy"]]);

  await app.inject({ method: "GET", url: "/api/books", headers });
  assert.deepEqual(params, [null, null, null, null]);

  const bad = await app.inject({
    method: "GET",
    url: "/api/books?minPages=abc",
    headers,
  });
  assert.equal(bad.statusCode, 400);
  await app.close();
});

test("database errors return a generic 500 without leaking the message", async () => {
  const app = build(
    fakeDb(async () => {
      throw new Error('relation "books" does not exist');
    }),
  );

  const res = await app.inject({ method: "GET", url: "/api/books", headers: await authHeader(app) });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.json(), { error: "Internal Server Error" });
  await app.close();
});

test("GET /health returns 503 when the database is down", async () => {
  const app = build(
    fakeDb(async () => {
      throw new Error("ECONNREFUSED");
    }),
  );

  const res = await app.inject({ method: "GET", url: "/health" });

  assert.equal(res.statusCode, 503);
  await app.close();
});

test("serves the built web app with cache headers when staticDir is set", async () => {
  const dir = await mkdtemp(join(tmpdir(), "web-"));
  await mkdir(join(dir, "assets"));
  await writeFile(join(dir, "index.html"), "<h1>Books</h1>");
  await writeFile(join(dir, "assets", "app-abc123.js"), "console.log(1)");
  const app = build(
    fakeDb(async () => ({ rows: [] })),
    { staticDir: dir },
  );

  const page = await app.inject({ method: "GET", url: "/" });
  const asset = await app.inject({
    method: "GET",
    url: "/assets/app-abc123.js",
  });

  assert.equal(page.statusCode, 200);
  assert.match(page.body, /Books/);
  assert.equal(page.headers["cache-control"], "no-cache");
  assert.equal(
    asset.headers["cache-control"],
    "public, max-age=31536000, immutable",
  );
  await app.close();
});

test("book routes reject requests without a valid token", async () => {
  const app = build(fakeDb(async () => ({ rows: [] })));

  const none = await app.inject({ method: "GET", url: "/api/books" });
  const forged = await app.inject({
    method: "GET",
    url: "/api/books/facets",
    headers: { authorization: "Bearer not.a.token" },
  });

  assert.equal(none.statusCode, 401);
  assert.equal(forged.statusCode, 401);
  await app.close();
});

test("signup stores a hash and returns a token that works on /me", async () => {
  let stored = "";
  const user = { id: 7, email: "zoe@example.com", name: "Zoe", role: "reader" };
  const app = build(
    fakeDb(async (sql, params) => {
      if (sql.includes("INSERT")) stored = params[2] as string;
      return { rows: [user] };
    }),
  );

  const res = await app.inject({
    method: "POST",
    url: "/api/auth/signup",
    payload: { email: "Zoe@example.com", name: "Zoe", password: "correct horse" },
  });
  assert.equal(res.statusCode, 201);
  assert.notEqual(stored, "correct horse");
  assert.match(stored, /^[0-9a-f]{32}:[0-9a-f]{128}$/);

  const me = await app.inject({
    method: "GET",
    url: "/api/auth/me",
    headers: { authorization: `Bearer ${res.json().token}` },
  });
  assert.deepEqual(me.json(), user);

  const short = await app.inject({
    method: "POST",
    url: "/api/auth/signup",
    payload: { email: "a@b.co", name: "A", password: "short" },
  });
  assert.equal(short.statusCode, 400);
  await app.close();
});

test("signup with an existing email returns 409", async () => {
  const app = build(
    fakeDb(async () => {
      throw Object.assign(new Error("duplicate key"), { code: "23505" });
    }),
  );
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/signup",
    payload: { email: "ana@example.com", name: "Ana", password: "password123" },
  });
  assert.equal(res.statusCode, 409);
  await app.close();
});

test("login accepts the right password and rejects wrong password or unknown email alike", async () => {
  const row = {
    id: 3, email: "ana@example.com", name: "Ana", role: "reader",
    password_hash: await hashPassword("password123"),
  };
  const app = build(
    fakeDb(async (_sql, params) => ({ rows: params[0] === "ana@example.com" ? [row] : [] })),
  );
  const login = (email: string, password: string) =>
    app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } });

  const ok = await login("ana@example.com", "password123");
  assert.equal(ok.statusCode, 200);
  assert.ok(ok.json().token);
  assert.ok(!("password_hash" in ok.json().user));

  const wrong = await login("ana@example.com", "nope-nope");
  const unknown = await login("nobody@example.com", "password123");
  assert.equal(wrong.statusCode, 401);
  assert.deepEqual(wrong.json(), unknown.json());
  await app.close();
});
