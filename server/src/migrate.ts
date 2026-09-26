import { loadConfig } from './config.ts';
import { connect, migrate } from './db/connect.ts';

// Brings the database up to date, then stops. Used when deploying.
const db = connect(loadConfig().databaseUrl);
await migrate(db);
await db.destroy();
console.log('Database is up to date.');
