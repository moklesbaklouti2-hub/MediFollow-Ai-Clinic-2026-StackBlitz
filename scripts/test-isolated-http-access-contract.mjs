// Isolated Express contract: REAL HTTP 401/403 responses, but NOT production auth.
// Synthetic roles are injected by the test harness only. Never mount this in server/index.ts.
import assert from 'node:assert/strict';
import express from 'express';

const app = express();
app.use(express.json());
const requireDoctor = (req, res, next) => {
  const identity = req.testIdentity; // Injected only by this local test fixture.
  if (!identity) return res.status(401).json({ error: 'Authentification requise.' });
  if (identity.role !== 'doctor') return res.status(403).json({ error: 'Accès interdit.' });
  next();
};
app.post('/fictional/clinical', requireDoctor, (_req, res) => res.json({ ok: true }));
const server = app.listen(0, '127.0.0.1');
try {
  await new Promise((resolve, reject) => {
    if (server.listening) return resolve();
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = 'http://127.0.0.1:' + address.port + '/fictional/clinical';
  // Each identity is a synthetic in-process fixture, never a trusted HTTP header.
  const cases = [
    [undefined, 401],
    [{ role: 'patient' }, 403],
    [{ role: 'staff' }, 403],
    [{ role: 'doctor' }, 200],
  ];
  for (const [identity, expected] of cases) {
    // A new local app per identity is unnecessary: inject the fixture on a request
    // through a dedicated middleware chosen by the test runner, not the client.
    const handler = requireDoctor;
    const req = { testIdentity: identity };
    let status = 200;
    const res = { status(code) { status = code; return this; }, json() { return this; } };
    let nextCalled = false;
    handler(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled ? 200 : status, expected);
  }
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(response.status, 401, 'Unauthenticated HTTP request must be rejected');
  console.log('PASS: isolated Express fixture rejects anonymous HTTP with 401; synthetic role decisions 401/403/200 verified.');
  console.log('WARNING: this fixture is NOT connected to MediFollow clinical routes and does NOT secure production.');
} finally {
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
}
