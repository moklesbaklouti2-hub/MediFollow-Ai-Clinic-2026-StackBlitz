import assert from 'node:assert/strict';
import express from 'express';
import { hashDoctorPassword } from '../server/security/doctorCredentials.ts';
import { createDoctorLogin } from '../server/security/doctorLogin.ts';
import { createDoctorSessionGuard } from '../server/security/doctorSessionGuard.ts';
import { createSessionStore } from '../server/security/sessionStore.ts';

let now = 1000;
const sessions = createSessionStore({ ttlMs: 1000, now: () => now });
const password = 'Fictional-test-only-password-2026!';
const passwordHash = await hashDoctorPassword(password);
const auth = createDoctorLogin({ username: 'fictional-doctor', passwordHash, sessions, now: () => now, maxFailures: 2, lockoutMs: 500 });
const app = express();
app.use(express.json({ limit: '4kb' }));
app.post('/fictional/login', auth.login);
app.post('/fictional/logout', auth.logout);
app.post('/fictional/clinical', createDoctorSessionGuard(sessions), (_req, res) => res.json({ ok: true }));
const server = app.listen(0, '127.0.0.1');
try {
  await new Promise((resolve, reject) => {
    if (server.listening) resolve();
    else { server.once('listening', resolve); server.once('error', reject); }
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/fictional/';
  const post = (path: string, body?: object, token?: string) => fetch(base + path, {
    method: 'POST',
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  assert.equal((await post('clinical')).status, 401);
  const bad = { username: 'fictional-doctor', password: 'wrong-password-2026!' };
  assert.equal((await post('login', bad)).status, 401);
  assert.equal((await post('login', bad)).status, 401);
  assert.equal((await post('login', { username: 'fictional-doctor', password })).status, 429);
  now += 500;
  const response = await post('login', { username: 'fictional-doctor', password });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const { token } = await response.json() as { token: string };
  assert.equal((await post('clinical', undefined, token)).status, 200);
  assert.equal((await post('logout', undefined, token)).status, 204);
  assert.equal((await post('clinical', undefined, token)).status, 401);
  const fresh = await post('login', { username: 'fictional-doctor', password });
  const freshToken = (await fresh.json() as { token: string }).token;
  now += 1000;
  assert.equal((await post('clinical', undefined, freshToken)).status, 401);
  console.log('PASS: isolated HTTP login, lockout, logout, session expiry; NOT production-wired.');
} finally {
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
}
