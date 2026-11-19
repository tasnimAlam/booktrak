import Fastify, { type FastifyError, type FastifyServerOptions } from "fastify";
import dbPlugin, { type Db } from "./plugins/db.ts";
import booksRoutes from "./routes/books.ts";
import healthRoutes from "./routes/health.ts";
import staticFiles from "./plugins/static.ts";
import { bookSchema } from "./schemas/book.ts";

export type AppOptions = FastifyServerOptions & { staticDir?: string };

// Factory without listen(): tests call app.inject() on it, server.ts adds the network side.
export function buildApp(db: Db, { staticDir, ...opts }: AppOptions = {}) {
  const app = Fastify(opts);

  app.addSchema(bookSchema);
  app.register(dbPlugin, { db });

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
  app.register(booksRoutes, { prefix: "/api/books" });
  // Unset in local dev, where Vite serves the web app.
  if (staticDir) app.register(staticFiles, { root: staticDir });

  return app;
}
