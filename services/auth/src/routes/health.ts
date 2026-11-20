import type { FastifyPluginAsync } from "fastify";

// Readiness check: pings the DB so the compose healthcheck fails when Postgres is unreachable.
const health: FastifyPluginAsync = async (app) => {
  app.get("/health", async (_req, reply) => {
    try {
      await app.db.query("SELECT 1");
      return { ok: true };
    } catch (err) {
      app.log.warn({ err }, "health check: database unreachable");
      return reply.code(503).send({ ok: false });
    }
  });
};

export default health;
