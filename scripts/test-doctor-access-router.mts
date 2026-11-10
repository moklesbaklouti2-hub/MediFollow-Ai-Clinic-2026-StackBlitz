import assert from 'node:assert/strict';
import express from 'express';
import { hashDoctorPassword } from '../server/security/doctorCredentials.ts';
import { createDoctorAccessRouter } from '../server/security/doctorAccessRouter.ts';
import { createSessionStore } from '../server/security/sessionStore.ts';
import { CLINICAL_PATHS } from '../server/security/protectedClinicalRouter.ts';

const sessions = createSessionStore();
const password = 'Synthetic-test-only-password-2026!';
const passwordHash = await hashDoctorPassword(password);
const calls: string[] = [];
const handlers = Object.fromEntries(CLINICAL_PATHS.map(path => [path, (_req: express.Request, res: express.Response) => {
  calls.push(path);
  res.status(200).json({ synthetic: true });
}])) as Parameters<typeof createDoctorAccessRouter>[0]['handlers'];
const app = express();
app.use(express.json({ limit: '4kb' }));
app.use(createDoctorAccessRouter({ username: 'fictional-doctor', passwordHash, sessions, handlers }));
const server = app.listen(0, '127.0.0.1');
try {
  await new Promise<void>((resolve, reject) => {
    if (server.listening) resolve();
    else { server.once('listening', resolve); server.once('error', reject); }
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port;
  const post = (path: string, body?: object, token?: string) => fetch(base + path, {
    method: 'POST',
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  for (const path of CLINICAL_PATHS) assert.equal((await post(path)).status, 401, path + ' anonymous');
  assert.equal((await post('/api/auth/login', { username: 'fictional-doctor', password: 'invalid-password' })).status, 401);
  const login = await post('/api/auth/login', { username: 'fictional-doctor', password });
  assert.equal(login.status, 200);
  assert.equal(login.headers.get('cache-control'), 'no-store');
  const { token } = await login.json() as { token: string };
  for (const path of CLINICAL_PATHS) assert.equal((await post(path, undefined, token)).status, 200, path + ' authorized');
  assert.deepEqual(calls, [...CLINICAL_PATHS]);
  assert.equal((await post('/api/auth/logout', undefined, token)).status, 204);
  for (const path of CLINICAL_PATHS) assert.equal((await post(path, undefined, token)).status, 401, path + ' revoked');
  assert.deepEqual(calls, [...CLINICAL_PATHS], 'Revoked sessions must not reach handlers');
  console.log('PASS: isolated integrated login, protected 3 clinical paths, logout and revocation.');
  console.log('WARNING: fixture only, no live server mounting, browser cookies or public deployment.');
} finally {
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
}
