import fp from "fastify-plugin";
import type { Pool } from "pg";

// Only what routes need, so tests can pass a fake instead of a real Pool.
export type Db = Pick<Pool, "query"> & Partial<Pick<Pool, "end">>;

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
  }
}

// fp() skips Fastify's encapsulation, so `app.db` is visible to every plugin registered after this one.
export default fp<{ db: Db }>(
  async (app, { db }) => {
    app.decorate("db", db);
    // Pool closes with the server, after in-flight requests finish.
    app.addHook("onClose", async () => {
      await db.end?.();
    });
  },
  { name: "db" },
);
