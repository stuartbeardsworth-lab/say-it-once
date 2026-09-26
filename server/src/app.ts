import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import { sql, type Kysely } from 'kysely';
import type { Config } from './config.ts';
import type { Database } from './db/schema.ts';
import type { Mailer } from './mailer.ts';
import { authRoutes } from './routes/auth.ts';
import { deletionRoutes } from './routes/deletion.ts';
import { fileRoutes } from './routes/files.ts';
import { keyRoutes } from './routes/keys.ts';
import { syncRoutes } from './routes/sync.ts';
import { readSession } from './session.ts';

// The API. It only ever stores and returns ciphertext and the minimum
// metadata (docs/architecture.md, "Threat model"). Request bodies are never
// logged, and neither is the session cookie.

export interface AppDeps {
  db: Kysely<Database>;
  config: Config;
  mailer: Mailer;
  /** Off in tests. */
  logger?: boolean;
}

export function buildApp({ db, config, mailer, logger = true }: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: logger ? { redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'] } : false,
    // Behind the reverse proxy on the server, the client's address is in X-Forwarded-For.
    trustProxy: true,
    // No type coercion: a null must stay null (a deleted item's key), never become "".
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  });
  app.register(cookie);
  app.decorateRequest('session', null);

  // Only the app's own addresses may call the API from a browser (CORS), and
  // anything that changes data must come from one of them: with the
  // SameSite=Strict cookie, this stops other sites making requests as the
  // person (cross-site request forgery).
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    const allowed = origin !== undefined && config.appOrigins.includes(origin);
    if (allowed) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Credentials', 'true');
      reply.header('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      if (!allowed) return reply.code(403).send({ error: 'origin' });
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      reply.header('Access-Control-Allow-Headers', 'Content-Type');
      reply.header('Access-Control-Max-Age', '600');
      return reply.code(204).send();
    }
    if (!['GET', 'HEAD'].includes(request.method) && !allowed) return reply.code(403).send({ error: 'origin' });
  });

  app.addHook('preHandler', async (request, reply) => {
    if (!request.routeOptions.config.signedIn) return;
    const session = await readSession(db, request);
    if (session === 'signed-out') return reply.code(401).send({ error: 'signed-out' });
    if (!session) return reply.code(401).send({ error: 'not-signed-in' });
    request.session = session;
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Content-Type-Options', 'nosniff');
    return payload;
  });

  app.setErrorHandler((error: { statusCode?: number; validation?: unknown }, request, reply) => {
    if (error.validation) return reply.code(400).send({ error: 'invalid' });
    if (error.statusCode === 413) return reply.code(413).send({ error: 'too-large' });
    request.log.error({ err: error }, 'request failed');
    return reply.code(500).send({ error: 'server' });
  });

  app.get('/health', async () => {
    await sql`select 1`.execute(db);
    return { ok: true };
  });

  authRoutes(app, db, config, mailer);
  keyRoutes(app, db);
  syncRoutes(app, db);
  fileRoutes(app, db);
  deletionRoutes(app, db, config);
  return app;
}
