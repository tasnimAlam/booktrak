import Fastify, { type FastifyError, type FastifyServerOptions } from "fastify";
import authPlugin from "./plugins/auth.ts";
import dbPlugin, { type Db } from "./plugins/db.ts";
import authRoutes from "./routes/auth.ts";
import healthRoutes from "./routes/health.ts";

export type AppOptions = FastifyServerOptions & {
  jwtSecret: string;
};

// Factory without listen(): tests call app.inject() on it, server.ts adds the network side.
export function buildApp(db: Db, { jwtSecret, ...opts }: AppOptions) {
  const app = Fastify(opts);

  app.register(dbPlugin, { db });
  app.register(authPlugin, { secret: jwtSecret });

  app.setErrorHandler((err: FastifyError, req, reply) => {
    const status = err.statusCode ?? 500;
    // 4xx messages (e.g. validation) help the client; 5xx messages can leak SQL or internals.
    if (status >= 500) {
      req.log.error({ err }, "request failed");
      return reply.code(status).send({ error: "Internal Server Error" });
    }
    return reply.code(status).send({ error: err.message });
  });

  app.register(healthRoutes);
  app.register(authRoutes, { prefix: "/api/auth" });

  return app;
}
