// Isolated synthetic HTTP test. Simulates a locally trusted HTTPS reverse proxy;
// never validates a real TLS certificate or deploys actual clinical endpoints.
import assert from 'node:assert/strict';
import express, { type Request, type Response } from 'express';
import { createDoctorCookieAuth } from '../server/security/doctorCookieAuth.ts';
import { hashDoctorPassword } from '../server/security/doctorCredentials.ts';
import { createSessionStore } from '../server/security/sessionStore.ts';
import { CLINICAL_PATHS } from '../server/security/protectedClinicalRouter.ts';

const origin = 'https://clinic.example';
const password = 'Fictional-medical-login-2026!';
let now = 10_000;
const store = createSessionStore({ now: () => now, ttlMs: 30_000 });
const passwordHash = await hashDoctorPassword(password);
const executed: string[] = [];
const handlers = Object.fromEntries(CLINICAL_PATHS.map(path => [
  path, (_req: Request, res: Response) => { executed.push(path); res.status(200).json({ synthetic: true }); },
])) as Parameters<typeof createDoctorCookieAuth>[0]['handlers'];

const app = express();
// Trust only loopback proxy for this synthetic fixture; never trust arbitrary forwarding.
app.set('trust proxy', 'loopback');
app.use(express.json({ limit: '4kb' }));
app.use(createDoctorCookieAuth({
  username: 'fictional-doctor', passwordHash, sessions: store,
  publicOrigin: origin, handlers, now: () => now,
  maxFailures: 3, lockoutMs: 5000,
}));
const server = app.listen(0, '127.0.0.1');
try {
  await new Promise<void>((resolve, reject) => {
    if (server.listening) resolve();
    else { server.once('listening', resolve); server.once('error', reject); }
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port;
  const request = (path: string, options: {
    method?: 'POST' | 'GET';
    body?: object;
    cookie?: string;
    csrf?: string;
    origin?: string | null;
    simulateHttps?: boolean;
    fetchSite?: string;
  } = {}) => {
    const headers: Record<string, string> = {};
    if (options.simulateHttps !== false) headers['x-forwarded-proto'] = 'https';
    if (options.origin !== null) headers.origin = options.origin ?? origin;
    if (options.body) headers['content-type'] = 'application/json';
    if (options.cookie) headers.cookie = options.cookie;
    if (options.csrf) headers['x-medifollow-csrf'] = options.csrf;
    if (options.fetchSite) headers['sec-fetch-site'] = options.fetchSite;
    return fetch(base + path, {
      method: options.method ?? 'POST', headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(7000),
    });
  };
  const validLogin = { username: 'fictional-doctor', password };
  assert.equal((await request('/api/auth/login', { body: validLogin, origin: null })).status, 403);
  assert.equal((await request('/api/auth/login', { body: validLogin, origin: 'https://attacker.example' })).status, 403);
  assert.equal((await request('/api/auth/login', { body: validLogin, simulateHttps: false })).status, 403);
  assert.equal((await request('/api/auth/login', { body: { ...validLogin, password: 'wrong' } })).status, 401);
  const login = await request('/api/auth/login', { body: validLogin });
  assert.equal(login.status, 204);
  assert.equal(await login.text(), '', 'The cookie login must never expose a bearer token');
  assert.equal(login.headers.get('cache-control'), 'no-store');
  const setCookie = login.headers.get('set-cookie') ?? '';
  assert.match(setCookie, /^__Host-medifollow_session=[A-Za-z0-9_-]{43};/);
  for (const attribute of ['Path=/', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Max-Age=']) {
    assert.ok(setCookie.includes(attribute), 'Cookie missing ' + attribute);
  }
  const cookie = setCookie.split(';')[0];
  for (const path of CLINICAL_PATHS) {
    assert.equal((await request(path)).status, 401);
    assert.equal((await request(path, { cookie })).status, 403, path + ' missing CSRF');
    assert.equal((await request(path, { cookie, csrf: '0'.repeat(64) })).status, 403, path + ' wrong CSRF');
  }
  assert.deepEqual(executed, [], 'Unauthenticated requests must never reach clinical handlers');
  const missingCookie = await request('/api/auth/csrf', { method: 'GET', origin: null });
  assert.equal(missingCookie.status, 401);
  const foreignFetch = await request('/api/auth/csrf', { method: 'GET', cookie, origin: null, fetchSite: 'cross-site' });
  assert.equal(foreignFetch.status, 403);
  const csrfResponse = await request('/api/auth/csrf', { method: 'GET', cookie, origin: null, fetchSite: 'same-origin' });
  assert.equal(csrfResponse.status, 200);
  assert.equal(csrfResponse.headers.get('cache-control'), 'no-store');
  const { csrfToken } = await csrfResponse.json() as { csrfToken: string };
  assert.match(csrfToken, /^[a-f0-9]{64}$/);
  for (const path of CLINICAL_PATHS) {
    assert.equal((await request(path, { cookie, csrf: csrfToken, origin: 'https://attacker.example' })).status, 403);
    assert.equal((await request(path, { cookie, csrf: csrfToken })).status, 200);
  }
  assert.deepEqual(executed, [...CLINICAL_PATHS]);
  assert.equal((await request('/api/auth/logout', { cookie })).status, 403);
  const logout = await request('/api/auth/logout', { cookie, csrf: csrfToken });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0/);
  for (const path of CLINICAL_PATHS) {
    assert.equal((await request(path, { cookie, csrf: csrfToken })).status, 401, path + ' revoked');
  }
  const another = await request('/api/auth/login', { body: validLogin });
  const freshCookie = (another.headers.get('set-cookie') ?? '').split(';')[0];
  now += 30_000;
  assert.equal((await request('/api/auth/csrf', { method: 'GET', cookie: freshCookie, origin: null })).status, 401);
  assert.deepEqual(executed, [...CLINICAL_PATHS], 'Expired or revoked sessions must not reach clinical handlers');
  console.log('PASS: isolated cookie login 204, HttpOnly/Secure, same-origin, CSRF, clinical guard, logout, expiry.');
  console.log('WARNING: simulated reverse proxy only; NOT real TLS or production deployment.');
} finally {
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
}
