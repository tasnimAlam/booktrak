// Read and validate env once at startup, so a bad config fails fast instead of on the first request.
export interface Config {
  databaseUrl: string;
  host: string;
  port: number;
  logLevel: string;
  staticDir?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`Invalid PORT: ${env.PORT}`);

  return {
    databaseUrl,
    host: env.HOST ?? "0.0.0.0",
    port,
    logLevel: env.LOG_LEVEL ?? "info",
    staticDir: env.STATIC_DIR || undefined,
  };
}
