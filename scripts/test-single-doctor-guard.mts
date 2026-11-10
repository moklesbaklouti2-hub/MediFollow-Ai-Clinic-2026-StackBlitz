// Synthetic HTTP regression for the disabled, server-side guard.
// This is not a session system and is not wired into the clinical API.
import assert from 'node:assert/strict';
import express from 'express';
import { createSingleDoctorGuard } from '../server/security/singleDoctorGuard.ts';

assert.throws(() => createSingleDoctorGuard('short'));
const secret = 'fictional-doctor-secret-not-for-production-2026';
const app = express();
app.post('/fictional/clinical', createSingleDoctorGuard(secret), (_req, res) => res.json({ ok: true }));
const server = app.listen(0, '127.0.0.1');
try {
  await new Promise((resolve, reject) => {
    if (server.listening) resolve();
    else { server.once('listening', resolve); server.once('error', reject); }
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = 'http://127.0.0.1:' + address.port + '/fictional/clinical';
  const cases = [
    [undefined, 401],
    ['Bearer invalid-secret', 403],
    ['Bearer ' + secret, 200],
    ['Basic ' + secret, 401],
  ];
  for (const [authorization, expected] of cases) {
    const headers = authorization ? { authorization } : {};
    const response = await fetch(url, { method: 'POST', headers, signal: AbortSignal.timeout(3000) });
    assert.equal(response.status, expected);
  }
  console.log('PASS: disabled single-doctor guard HTTP 401/403/200; NOT connected to production routes.');
} finally {
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
}
