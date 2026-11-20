import fastifyJwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

// What goes inside the token. sub = user id (string, per the JWT spec).
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: string };
    user: { sub: string; role: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp<{ secret: string }>(
  async (app, { secret }) => {
    // This service only verifies tokens (signed by the auth service with the same secret).
    // shortcut: shared HS256 secret means books could also mint tokens; switch to RS256 (auth keeps the private key, books gets only the public key) when services have different owners.
    await app.register(fastifyJwt, { secret, sign: { expiresIn: "1h" } });

    // Use as a hook on any route or plugin that needs a logged-in user. Sets req.user.
    app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        await req.jwtVerify();
      } catch {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    });
  },
  { name: "auth" },
);
