import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "./app.ts";
import type { Db } from "./plugins/db.ts";
import { hashPassword } from "./password.ts";

const fakeDb = (query: (sql: string, params: unknown[]) => Promise<unknown>) =>
  ({ query }) as unknown as Db;
const jwtSecret = "test-secret-at-least-32-characters-long";
const build = (db: Db) => buildApp(db, { jwtSecret });

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
