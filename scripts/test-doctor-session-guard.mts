import assert from 'node:assert/strict';
import express from 'express';
import { createSessionStore } from '../server/security/sessionStore.ts';
import { createDoctorSessionGuard } from '../server/security/doctorSessionGuard.ts';

let now = 1000;
const store = createSessionStore({ ttlMs: 1000, now: () => now });
const app = express();
app.post('/fictional/clinical', createDoctorSessionGuard(store), (_req, res) => res.json({ ok: true }));
const server = app.listen(0, '127.0.0.1');
try {
  await new Promise((resolve, reject) => {
    if (server.listening) resolve();
    else { server.once('listening', resolve); server.once('error', reject); }
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = 'http://127.0.0.1:' + address.port + '/fictional/clinical';
  const post = async (token?: string) => {
    const headers = token ? { authorization: 'Bearer ' + token } : {};
    const response = await fetch(url, { method: 'POST', headers, signal: AbortSignal.timeout(3000) });
    return response.status;
  };
  assert.equal(await post(), 401);
  assert.equal(await post('x'.repeat(43)), 401);
  const first = store.issue('fictional-doctor');
  assert.equal(await post(first.token), 200);
  store.revoke(first.token);
  assert.equal(await post(first.token), 401);
  const second = store.issue('fictional-doctor');
  assert.equal(await post(second.token), 200);
  now = 2000;
  assert.equal(await post(second.token), 401);
  console.log('PASS: isolated HTTP session guard rejects anonymous, invalid, revoked and expired tokens; permits active doctor.');
  console.log('WARNING: not connected to actual clinical endpoints; login and role authorization are not implemented.');
} finally {
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
}
