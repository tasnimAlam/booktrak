import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "./app.ts";
import type { Db } from "./plugins/db.ts";

const fakeDb = (query: (sql: string, params: unknown[]) => Promise<unknown>) =>
  ({ query }) as unknown as Db;
const jwtSecret = "test-secret-at-least-32-characters-long";
const build = (db: Db) => buildApp(db, { jwtSecret });

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
