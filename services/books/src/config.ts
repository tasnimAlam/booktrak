// Read and validate env once at startup, so a bad config fails fast instead of on the first request.
export interface Config {
  databaseUrl: string;
  host: string;
  port: number;
  logLevel: string;
  jwtSecret: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`Invalid PORT: ${env.PORT}`);

  // Anyone with the secret can forge tokens for any user, so require a long random one.
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32)
    throw new Error("JWT_SECRET must be set and at least 32 characters");

  return {
    databaseUrl,
    jwtSecret,
    host: env.HOST ?? "0.0.0.0",
    port,
    logLevel: env.LOG_LEVEL ?? "info",
  };
}
