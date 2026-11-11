// Exercises the REAL Express clinical handlers through the test-only cookie gate.
// Never runs outside loopback, never contacts AI providers or uses patient data.
// Forwarded HTTPS is simulated; this is NOT a real TLS/proxy deployment test.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { hashDoctorPassword } from '../server/security/doctorCredentials.ts';

const base = 'http://127.0.0.1:3001';
const origin = 'https://clinic.example';
const password = 'Fixture-only-doctor-password-2026!';
const passwordHash = await hashDoctorPassword(password);

const occupied = await new Promise<boolean>(resolve => {
  const socket = connect({ host: '127.0.0.1', port: 3001 });
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', (error: NodeJS.ErrnoException) => {
    socket.destroy();
    resolve(error.code !== 'ECONNREFUSED');
  });
});
assert.equal(occupied, false, 'Refusing to test an unrelated server on port 3001');
const child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server/index.ts'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'production',
    REMOTE_ACCESS_MODE: 'enabled',
    REMOTE_COOKIE_AUTH_MODE: 'integration-test',
    COOKIE_AUTH_TEST_ONLY_ACK: 'synthetic-fixture-only',
    COOKIE_AUTH_TEST_TTL_MS: '6000',
    PUBLIC_ORIGIN: origin + '/',
    REMOTE_TRUST_PROXY: 'verified',
    DOCTOR_USERNAME: 'fixture-doctor',
    DOCTOR_PASSWORD_HASH: passwordHash,
    GROQ_API_KEY: '',
    CLOUDFLARE_API_TOKEN: '',
    OPENROUTER_API_KEY: '',
  },
});
let output = '';
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', (chunk: Buffer) => { output = (output + chunk.toString()).slice(-3000); });
}
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null) throw new Error('Synthetic Express server exited: ' + output);
    try {
      const health = await fetch(base + '/api/health', { signal: AbortSignal.timeout(500) });
      if (health.status === 200) { ready = true; break; }
    } catch { /* Server is starting. */ }
    await delay(200);
  }
  assert.ok(ready, 'Synthetic Express server did not start: ' + output);

  type Options = { method?: 'POST' | 'GET'; body?: unknown; cookie?: string;
    csrf?: string; requestOrigin?: string | null; https?: boolean };
  const request = (path: string, options: Options = {}) => {
    const headers: Record<string, string> = {};
    if (options.https !== false) headers['x-forwarded-proto'] = 'https';
    if (options.requestOrigin !== null) headers.origin = options.requestOrigin ?? origin;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.cookie) headers.cookie = options.cookie;
    if (options.csrf) headers['x-medifollow-csrf'] = options.csrf;
    return fetch(base + path, {
      method: options.method ?? 'POST', headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(5000),
    });
  };

  const fictional = { username: 'fixture-doctor', password };
  assert.equal((await request('/api/auth/login', { body: fictional, https: false })).status, 403);
  assert.equal((await request('/api/auth/login', { body: fictional, requestOrigin: null })).status, 403);
  assert.equal((await request('/api/auth/login', { body: fictional, requestOrigin: 'https://attacker.example' })).status, 403);
  const invalidLogin = await request('/api/auth/login', { body: { ...fictional, password: 'wrong' } });
  assert.equal(invalidLogin.status, 401);

  const clinical = [
    { path: '/api/clinical/analyze', body: { context: null }, expectedError: 'Contexte clinique invalide.' },
    { path: '/api/commands/interpret', body: { instruction: '' }, expectedError: 'Commande vide.' },
    { path: '/api/chat', body: { message: '' }, expectedError: 'Message vide.' },
  ];
  for (const item of clinical) {
    assert.equal((await request(item.path, { body: item.body })).status, 401, item.path + ' anonymous');
  }

  const login = await request('/api/auth/login', { body: fictional });
  assert.equal(login.status, 204);
  assert.equal(await login.text(), '', 'Login must not return a bearer token');
  const setCookie = login.headers.get('set-cookie') ?? '';
  assert.match(setCookie, /^__Host-medifollow_session=[A-Za-z0-9_-]{43};/);
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) {
    assert.ok(setCookie.includes(attribute), 'Missing cookie flag: ' + attribute);
  }
  const cookie = setCookie.split(';')[0];

  for (const item of clinical) {
    assert.equal((await request(item.path, { body: item.body, cookie })).status, 403, item.path + ' missing CSRF');
    assert.equal((await request(item.path, { body: item.body, cookie, csrf: 'a'.repeat(64) })).status, 403, item.path + ' invalid CSRF');
  }
  const csrf = await request('/api/auth/csrf', { method: 'GET', cookie, requestOrigin: null });
  assert.equal(csrf.status, 200);
  const { csrfToken } = await csrf.json() as { csrfToken: string };
  assert.match(csrfToken, /^[a-f0-9]{64}$/);

  for (const item of clinical) {
    assert.equal((await request(item.path, { body: item.body, cookie, csrf: csrfToken, requestOrigin: 'https://attacker.example' })).status, 403);
    const response = await request(item.path, { body: item.body, cookie, csrf: csrfToken });
    assert.equal(response.status, 400, item.path + ' should reach the REAL validation handler after auth');
    assert.equal((await response.json() as { error: string }).error, item.expectedError);
  }
  assert.equal((await request('/api/auth/logout', { cookie, csrf: csrfToken })).status, 204);
  for (const item of clinical) {
    assert.equal((await request(item.path, { body: item.body, cookie, csrf: csrfToken })).status, 401, item.path + ' revoked');
  }
  // A fresh session must actually expire on the REAL Express process.
  const finalLogin = await request('/api/auth/login', { body: fictional });
  assert.equal(finalLogin.status, 204);
  const expiringCookie = (finalLogin.headers.get('set-cookie') ?? '').split(';')[0];
  assert.match(expiringCookie, /^__Host-medifollow_session=/);
  const activeBeforeExpiry = await request('/api/auth/csrf', { method: 'GET', cookie: expiringCookie, requestOrigin: null });
  assert.equal(activeBeforeExpiry.status, 200, 'New session valid before expiry');
  await delay(6300);
  assert.equal((await request('/api/auth/csrf', {
    method: 'GET', cookie: expiringCookie, requestOrigin: null,
  })).status, 401, 'Expired session must not obtain a CSRF token');
  for (const item of clinical) {
    assert.equal((await request(item.path, { body: item.body, cookie: expiringCookie })).status,
      401, item.path + ' expired session');
  }

  console.log('PASS: REAL Express handlers are reached only with synthetic cookie session + Origin + CSRF.');
  console.log('WARNING: loopback-only integration fixture with simulated HTTPS, NOT remotely deployable.');
} finally {
  child.kill('SIGTERM');
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(2000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}
