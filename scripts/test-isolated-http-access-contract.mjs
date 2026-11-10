// Isolated Express HTTP contract: 401, 403, and 200 with synthetic identities.
// This is NOT production authentication. Never import this fixture into server/index.ts.
import assert from 'node:assert/strict';
import express from 'express';

const app = express();
app.use(express.json({ limit: '4kb' }));

const requireDoctor = (req, res, next) => {
  // Only the test server injects identities. HTTP headers never establish a role.
  const identity = req.testIdentity;
  if (!identity) return res.status(401).json({ error: 'Authentification requise.' });
  if (identity.role !== 'doctor') return res.status(403).json({ error: 'Accès interdit.' });
  next();
};

// Test-only paths bind identities on the server side; they are not client credentials.
const fixtures = [
  { path: 'anonymous', identity: undefined, expected: 401 },
  { path: 'patient', identity: { role: 'patient' }, expected: 403 },
  { path: 'staff', identity: { role: 'staff' }, expected: 403 },
  { path: 'doctor', identity: { role: 'doctor' }, expected: 200 },
];
for (const fixture of fixtures) {
  app.post('/fictional/' + fixture.path + '/clinical',
    (req, _res, next) => { req.testIdentity = fixture.identity; next(); },
    requireDoctor,
    (_req, res) => res.json({ ok: true }));
}

const server = app.listen(0, '127.0.0.1');
try {
  await new Promise((resolve, reject) => {
    if (server.listening) return resolve();
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port;
  for (const fixture of fixtures) {
    const response = await fetch(base + '/fictional/' + fixture.path + '/clinical', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-role': 'doctor' },
      body: JSON.stringify({ patientId: 'fictional-only' }),
      signal: AbortSignal.timeout(3000),
    });
    assert.equal(response.status, fixture.expected, 'HTTP status mismatch for ' + fixture.path);
    const body = await response.json();
    if (fixture.expected === 200) assert.equal(body.ok, true);
    else assert.equal(typeof body.error, 'string');
  }
  console.log('PASS: isolated Express HTTP responses 401 anonymous, 403 patient/staff, 200 doctor; forged x-role ignored.');
  console.log('WARNING: fixture is NOT wired to MediFollow clinical endpoints; real authentication remains a deployment blocker.');
} finally {
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
}
