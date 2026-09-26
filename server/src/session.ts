import '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Kysely } from 'kysely';
import type { Config } from './config.ts';
import type { Database } from './db/schema.ts';
import { newSessionToken, sha256 } from './tokens.ts';

// Sessions (docs/architecture.md, "Sessions"): an HttpOnly, Secure,
// SameSite=Strict cookie holding a random token, one per device, expiring
// 90 days after it was last used. The server stores only the token's hash.

export const cookieName = 'sio_session';
const lifetimeDays = 90;

export interface Session {
  accountId: string;
  deviceId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    session: Session | null;
  }
  interface FastifyContextConfig {
    /** The route needs a signed-in device; others get 401. */
    signedIn?: boolean;
  }
}

/**
 * The session of a route marked `signedIn`. The preHandler in app.ts has
 * already refused the request if there isn't one, so this can't fail
 * unless a route forgets `config: { signedIn: true }`: then it fails loudly.
 */
export function sessionOf(request: FastifyRequest): Session {
  if (!request.session) throw new Error('Route used a session without config.signedIn');
  return request.session;
}

const expiry = () => new Date(Date.now() + lifetimeDays * 24 * 60 * 60 * 1000);

export async function startSession(db: Kysely<Database>, config: Config, reply: FastifyReply, session: Session): Promise<void> {
  const token = newSessionToken();
  await db
    .insertInto('sessions')
    .values({ tokenHash: sha256(token), accountId: session.accountId, deviceId: session.deviceId, expiresAt: expiry() })
    .execute();
  reply.setCookie(cookieName, token, {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'strict',
    path: '/',
    maxAge: lifetimeDays * 24 * 60 * 60,
  });
}

export function clearSessionCookie(config: Config, reply: FastifyReply): void {
  reply.clearCookie(cookieName, { httpOnly: true, secure: config.secureCookies, sameSite: 'strict', path: '/' });
}

/**
 * Finds the session for a request, if its cookie is valid. A device that has
 * been signed out from another device gets `signed-out`, so it knows to wipe
 * its copy of the record.
 */
export async function readSession(db: Kysely<Database>, request: FastifyRequest): Promise<Session | 'signed-out' | null> {
  const token = request.cookies[cookieName];
  if (!token) return null;
  const hash = sha256(token);
  const row = await db
    .selectFrom('sessions')
    .innerJoin('devices', 'devices.id', 'sessions.deviceId')
    .select(['sessions.accountId', 'sessions.deviceId', 'sessions.expiresAt', 'sessions.lastSeenAt', 'devices.signedOutAt'])
    .where('sessions.tokenHash', '=', hash)
    .executeTakeFirst();
  if (!row) return null;
  if (row.signedOutAt) {
    // Told once; after this the device is simply signed out.
    await db.deleteFrom('sessions').where('tokenHash', '=', hash).execute();
    return 'signed-out';
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await db.deleteFrom('sessions').where('tokenHash', '=', hash).execute();
    return null;
  }
  // Rolling expiry, written at most once an hour per session.
  if (Date.now() - row.lastSeenAt.getTime() > 60 * 60 * 1000) {
    const now = new Date();
    await db.updateTable('sessions').set({ lastSeenAt: now, expiresAt: expiry() }).where('tokenHash', '=', hash).execute();
    await db.updateTable('devices').set({ lastSeenAt: now }).where('id', '=', row.deviceId).execute();
  }
  return { accountId: row.accountId, deviceId: row.deviceId };
}
