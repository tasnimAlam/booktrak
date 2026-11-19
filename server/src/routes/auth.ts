import type { FastifyPluginAsync } from "fastify";
import { hashPassword, verifyPassword } from "../password.ts";

interface Credentials {
  email: string;
  password: string;
}
interface SignupBody extends Credentials {
  name: string;
}
interface UserRow {
  id: number;
  email: string;
  name: string;
  role: string;
}

const email = { type: "string", format: "email", maxLength: 254 } as const;
// maxLength caps scrypt work per request; very long passwords would be a cheap DoS.
const password = { type: "string", minLength: 8, maxLength: 128 } as const;

const userSchema = {
  type: "object",
  properties: {
    id: { type: "integer" },
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string" },
  },
} as const;
const authResponse = {
  type: "object",
  properties: { token: { type: "string" }, user: userSchema },
} as const;

// Login runs a full scrypt even for unknown emails, so timing can't reveal which emails exist.
const DUMMY_HASH = await hashPassword("timing-equalizer");

const auth: FastifyPluginAsync = async (app) => {
  const tokenFor = (u: UserRow) => app.jwt.sign({ sub: String(u.id), role: u.role });

  app.post<{ Body: SignupBody }>(
    "/signup",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "name", "password"],
          additionalProperties: false,
          properties: { email, password, name: { type: "string", minLength: 1, maxLength: 100 } },
        },
        response: { 201: authResponse },
      },
    },
    async (req, reply) => {
      const { email, name, password } = req.body;
      try {
        const { rows } = await app.db.query<UserRow>(
          `INSERT INTO users (email, name, password_hash)
           VALUES (lower($1), $2, $3)
           RETURNING id, email, name, role`,
          [email.trim(), name.trim(), await hashPassword(password)],
        );
        const user = rows[0]!;
        return reply.code(201).send({ token: tokenFor(user), user });
      } catch (err) {
        // 23505 = unique_violation on users_email_key (lower(email))
        if ((err as { code?: string }).code === "23505") {
          return reply.code(409).send({ error: "Email already registered" });
        }
        throw err;
      }
    },
  );

  app.post<{ Body: Credentials }>(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          additionalProperties: false,
          // Login doesn't enforce minLength: old accounts may predate a rule change.
          properties: { email, password: { type: "string", maxLength: 128 } },
        },
        response: { 200: authResponse },
      },
    },
    async (req, reply) => {
      const { rows } = await app.db.query<UserRow & { password_hash: string }>(
        `SELECT id, email, name, role, password_hash FROM users WHERE lower(email) = lower($1)`,
        [req.body.email.trim()],
      );
      const row = rows[0];
      const ok = await verifyPassword(req.body.password, row?.password_hash ?? DUMMY_HASH);
      // Same message for unknown email and wrong password, so it can't be used to find accounts.
      if (!row || !ok) return reply.code(401).send({ error: "Invalid email or password" });

      const { password_hash: _, ...user } = row;
      return { token: tokenFor(user), user };
    },
  );

  app.get(
    "/me",
    {
      onRequest: [app.authenticate],
      schema: {
        response: {
          200: userSchema,
          401: { type: "object", properties: { error: { type: "string" } } },
        },
      },
    },
    async (req, reply) => {
      const { rows } = await app.db.query<UserRow>(
        `SELECT id, email, name, role FROM users WHERE id = $1`,
        [req.user.sub],
      );
      // Valid token but the user was deleted since it was issued.
      if (!rows[0]) return reply.code(401).send({ error: "Unauthorized" });
      return rows[0];
    },
  );
};

export default auth;
