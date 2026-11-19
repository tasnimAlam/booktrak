import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "./app.ts";
import type { Db } from "./plugins/db.ts";

const fakeDb = (query: () => Promise<unknown>) => ({ query }) as unknown as Db;

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
  const app = buildApp(fakeDb(async () => ({ rows: [row] })));

  const res = await app.inject({ method: "GET", url: "/api/books" });

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
  const app = buildApp(db);

  const res = await app.inject({
    method: "GET",
    url: "/api/books?author=Ana&author=Ben&minPages=200&genre=fantasy",
  });
  assert.equal(res.statusCode, 200);
  // [authors, minPages, maxPages, genres]; a single genre is coerced to an array.
  assert.deepEqual(params, [["Ana", "Ben"], 200, null, ["fantasy"]]);

  await app.inject({ method: "GET", url: "/api/books" });
  assert.deepEqual(params, [null, null, null, null]);

  const bad = await app.inject({
    method: "GET",
    url: "/api/books?minPages=abc",
  });
  assert.equal(bad.statusCode, 400);
  await app.close();
});

test("database errors return a generic 500 without leaking the message", async () => {
  const app = buildApp(
    fakeDb(async () => {
      throw new Error('relation "books" does not exist');
    }),
  );

  const res = await app.inject({ method: "GET", url: "/api/books" });

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.json(), { error: "Internal Server Error" });
  await app.close();
});

test("GET /health returns 503 when the database is down", async () => {
  const app = buildApp(
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
  const app = buildApp(
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
