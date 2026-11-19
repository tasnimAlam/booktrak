import pg from "pg";
import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";

// shortcut: bigint (int8) ids parsed as JS numbers, exact only up to 2^53; return strings if ids get that big.
pg.types.setTypeParser(pg.types.builtins.INT8, Number);

const config = loadConfig();
const pool = new pg.Pool({ connectionString: config.databaseUrl });
const app = buildApp(pool, {
  logger: { level: config.logLevel },
  staticDir: config.staticDir,
});

// An idle client losing its connection emits 'error'; unhandled, it would crash the process.
pool.on("error", (err) => app.log.error({ err }, "idle postgres client error"));

// Graceful shutdown: stop accepting requests, let in-flight ones finish, then the db plugin closes the pool.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, async () => {
    app.log.info({ signal }, "shutting down");
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "error during shutdown");
      process.exit(1);
    }
  });
}

try {
  await app.listen({ host: config.host, port: config.port });
} catch (err) {
  app.log.error({ err }, "failed to start");
  process.exit(1);
}
