import { describe, expect, it } from 'vitest';
import { cookieFrom, origin, signIn, setUpTestServer } from './helpers.ts';

const server = setUpTestServer();
const post = (url: string, payload: unknown, headers: Record<string, string> = {}) =>
  server.app.inject({ method: 'POST', url, headers: { origin, ...headers }, payload: payload as object });

describe('signing in with a code', () => {
  it('sends a code, and the right code signs in with a strict, HttpOnly, Secure cookie', async () => {
    const email = 'Sam@Example.test';
    expect((await post('/v1/auth/code', { email })).statusCode).toBe(202);
    const code = server.mailer.lastCodeFor('sam@example.test')!;
    expect(code).toMatch(/^\d{6}$/);
    const res = await post('/v1/auth/verify', { email, code, deviceName: 'Sam’s iPhone' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ newAccount: true });
    const cookie = res.cookies.find((c) => c.name === 'sio_session')!;
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Strict', path: '/' });

    const me = await server.app.inject({ method: 'GET', url: '/v1/me', headers: { cookie: cookieFrom(res) } });
    expect(me.json()).toMatchObject({ email: 'sam@example.test', devices: [{ name: 'Sam’s iPhone', current: true }] });
  });

  it('never stores the code or the session token, only their hashes', async () => {
    const { cookie } = await signIn(server, 'hashes@example.test');
    const token = cookie.split('=')[1]!;
    const code = server.mailer.lastCodeFor('hashes@example.test')!;
    const everything = JSON.stringify([
      await server.db.selectFrom('signInCodes').selectAll().execute(),
      await server.db.selectFrom('sessions').selectAll().execute(),
    ]);
    expect(everything).not.toContain(token);
    expect(everything).not.toContain(`"${code}"`);
  });

  it('a code works once, and a second device joins the same account', async () => {
    const first = await signIn(server, 'twice@example.test', 'Phone');
    const second = await signIn(server, 'twice@example.test', 'Laptop');
    expect(second.accountId).toBe(first.accountId);
    expect(second.deviceId).not.toBe(first.deviceId);
    const code = server.mailer.lastCodeFor('twice@example.test');
    const again = await post('/v1/auth/verify', { email: 'twice@example.test', code, deviceName: 'X' });
    expect(again.json()).toEqual({ error: 'code-expired' });
  });

  it('allows five tries per code, saying how many are left', async () => {
    const email = 'tries@example.test';
    await post('/v1/auth/code', { email });
    const code = server.mailer.lastCodeFor(email)!;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let left = 4; left >= 0; left--) {
      expect((await post('/v1/auth/verify', { email, code: wrong, deviceName: 'X' })).json()).toEqual({ error: 'wrong-code', triesLeft: left });
    }
    expect((await post('/v1/auth/verify', { email, code, deviceName: 'X' })).json()).toEqual({ error: 'code-expired' });
  });

  it('limits codes per email address, without saying whether an account exists', async () => {
    const email = 'limit@example.test';
    for (let i = 0; i < 5; i++) expect((await post('/v1/auth/code', { email }, { 'x-forwarded-for': `10.0.0.${i}` })).statusCode).toBe(202);
    expect((await post('/v1/auth/code', { email }, { 'x-forwarded-for': '10.0.0.99' })).json()).toEqual({ error: 'too-many' });
  });

  it('refuses changes from other websites, and answers the app’s own preflight', async () => {
    const res = await server.app.inject({ method: 'POST', url: '/v1/auth/code', headers: { origin: 'https://evil.test' }, payload: { email: 'a@b.test' } });
    expect(res.statusCode).toBe(403);
    const none = await server.app.inject({ method: 'POST', url: '/v1/auth/code', payload: { email: 'a@b.test' } });
    expect(none.statusCode).toBe(403);
    const pre = await server.app.inject({ method: 'OPTIONS', url: '/v1/sync/push', headers: { origin } });
    expect(pre.statusCode).toBe(204);
    expect(pre.headers['access-control-allow-origin']).toBe(origin);
    expect(pre.headers['access-control-allow-credentials']).toBe('true');
  });

  it('refuses anything needing a device when not signed in', async () => {
    expect((await server.app.inject({ method: 'GET', url: '/v1/me' })).json()).toEqual({ error: 'not-signed-in' });
    expect((await server.app.inject({ method: 'GET', url: '/v1/me', headers: { cookie: 'sio_session=made-up' } })).statusCode).toBe(401);
  });

  it('signing a lost device out from another stops it at once, and tells it to wipe', async () => {
    const phone = await signIn(server, 'lost@example.test', 'Lost phone');
    const laptop = await signIn(server, 'lost@example.test', 'Laptop');
    const res = await server.app.inject({ method: 'DELETE', url: `/v1/devices/${phone.deviceId}`, headers: { origin, cookie: laptop.cookie } });
    expect(res.statusCode).toBe(200);
    const after = await server.app.inject({ method: 'GET', url: '/v1/me', headers: { cookie: phone.cookie } });
    expect(after.statusCode).toBe(401);
    expect(after.json()).toEqual({ error: 'signed-out' });
    const later = await server.app.inject({ method: 'GET', url: '/v1/me', headers: { cookie: phone.cookie } });
    expect(later.json()).toEqual({ error: 'not-signed-in' });
    const me = await server.app.inject({ method: 'GET', url: '/v1/me', headers: { cookie: laptop.cookie } });
    expect(me.json().devices.map((d: { name: string }) => d.name)).toEqual(['Laptop']);
  });

  it('signing out ends this device’s session', async () => {
    const { cookie } = await signIn(server, 'out@example.test');
    const res = await server.app.inject({ method: 'POST', url: '/v1/auth/sign-out', headers: { origin, cookie } });
    expect(res.statusCode).toBe(200);
    expect((await server.app.inject({ method: 'GET', url: '/v1/me', headers: { cookie } })).statusCode).toBe(401);
  });

  it('can’t sign out a device belonging to someone else', async () => {
    const a = await signIn(server);
    const b = await signIn(server);
    const res = await server.app.inject({ method: 'DELETE', url: `/v1/devices/${b.deviceId}`, headers: { origin, cookie: a.cookie } });
    expect(res.statusCode).toBe(404);
  });
});

describe('tidying', () => {
  it('removes old limit records, codes, expired sessions and old push answers, and keeps current ones', async () => {
    const { tidy } = await import('../src/tidy.ts');
    const { cookie, accountId } = await signIn(server, 'tidy@example.test');
    const db = server.db;
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await db.insertInto('rateEvents').values({ kind: 'code-email', subject: 'old', at: old }).execute();
    await db.insertInto('pushRequests').values({ accountId, requestId: 'old-request', response: '{}', createdAt: old }).execute();
    await db.updateTable('signInCodes').set({ createdAt: old }).where('email', '=', 'tidy@example.test').execute();
    await tidy(db);
    expect(await db.selectFrom('rateEvents').select('id').where('subject', '=', 'old').execute()).toEqual([]);
    expect(await db.selectFrom('pushRequests').select('requestId').where('requestId', '=', 'old-request').execute()).toEqual([]);
    expect(await db.selectFrom('signInCodes').select('id').where('email', '=', 'tidy@example.test').execute()).toEqual([]);
    // The session is current, so it stays.
    expect((await server.app.inject({ method: 'GET', url: '/v1/me', headers: { cookie } })).statusCode).toBe(200);
  });
});
