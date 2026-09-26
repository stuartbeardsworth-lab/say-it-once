import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { connect, migrate } from './db/connect.ts';
import { MemoryMailer, type Mailer } from './mailer.ts';
import { tidy } from './tidy.ts';

// Starts the API. The database is brought up to date first. The email
// provider is connected in Stage 8b; until then codes are only logged when
// MAILER=log, which is refused unless INSECURE_COOKIES=1 (local use only).

const config = loadConfig();
const db = connect(config.databaseUrl);
await migrate(db);

let mailer: Mailer;
if (process.env.MAILER === 'log' && !config.secureCookies) {
  const memory = new MemoryMailer();
  mailer = {
    async sendSignInCode(email, code) {
      await memory.sendSignInCode(email, code);
      console.log(`[local only] sign-in code for ${email}: ${code}`);
    },
  };
} else {
  throw new Error('No email provider is set up yet (Stage 8b). For local use: MAILER=log INSECURE_COOKIES=1');
}

const app = buildApp({ db, config, mailer });
await app.listen({ port: config.port, host: config.host });

const tidyNow = () => tidy(db).catch((error: unknown) => app.log.error({ err: error }, 'tidy failed'));
void tidyNow();
setInterval(() => void tidyNow(), 60 * 60 * 1000).unref();
