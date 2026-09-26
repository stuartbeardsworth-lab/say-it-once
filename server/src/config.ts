// Settings come from environment variables, so no secret is ever in the
// code or the repository. See docs/server.md for what each one means.

export interface Config {
  /** PostgreSQL connection, e.g. postgres://user:password@localhost:5432/say_it_once */
  databaseUrl: string;
  /** The app's own addresses allowed to call this API, e.g. https://app.example.co.uk */
  appOrigins: string[];
  /** Whether the session cookie needs HTTPS. Only false for local testing. */
  secureCookies: boolean;
  port: number;
  host: string;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    databaseUrl: required(env, 'DATABASE_URL'),
    appOrigins: required(env, 'APP_ORIGINS')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    secureCookies: env.INSECURE_COOKIES !== '1',
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? '127.0.0.1',
  };
}
