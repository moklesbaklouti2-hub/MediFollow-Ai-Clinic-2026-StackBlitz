import assert from 'node:assert/strict';
import express from 'express';
import { hashDoctorPassword } from '../server/security/doctorCredentials.ts';
import { createDoctorLogin } from '../server/security/doctorLogin.ts';
import { createSessionStore } from '../server/security/sessionStore.ts';

const password = 'Fictional-parallel-login-test-2026!';
const sessions = createSessionStore();
const auth = createDoctorLogin({
  username: 'fictional-doctor',
  passwordHash: await hashDoctorPassword(password),
  sessions,
  maxFailures: 2,
  lockoutMs: 60_000,
});
const app = express();
app.use(express.json({ limit: '4kb' }));
app.post('/fictional/login', auth.login);
const server = app.listen(0, '127.0.0.1');
try {
  await new Promise((resolve, reject) => {
    if (server.listening) resolve();
    else { server.once('listening', resolve); server.once('error', reject); }
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = 'http://127.0.0.1:' + address.port + '/fictional/login';
  const attempt = () => fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'fictional-doctor', password: 'wrong-password-2026!' }),
    signal: AbortSignal.timeout(10000),
  });
  const responses = await Promise.all(Array.from({ length: 8 }, attempt));
  const statuses = responses.map(response => response.status);
  assert.ok(statuses.every(status => status === 401 || status === 429), String(statuses));
  assert.ok(statuses.includes(429), 'Parallel attempts must encounter lockout or in-flight limit');
  const blocked = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'fictional-doctor', password }),
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(blocked.status, 429, 'Correct password must not bypass active lockout');
  console.log('PASS: parallel wrong-password attempts blocked; correct password cannot bypass lockout.');
  console.log('WARNING: in-process protection only; distributed rate limiting and production integration pending.');
} finally {
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
}
