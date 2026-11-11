import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { createSessionStore } from '../server/security/sessionStore.ts';
import { CLINICAL_PATHS, createProtectedClinicalRouter } from '../server/security/protectedClinicalRouter.ts';

const sessions = createSessionStore();
const app = express();
app.use(express.json());
const hits: string[] = [];
const handlers = Object.fromEntries(CLINICAL_PATHS.map(path => [path, (_req: express.Request, res: express.Response) => {
  hits.push(path);
  res.json({ ok: true });
}])) as Parameters<typeof createProtectedClinicalRouter>[1];
app.use(createProtectedClinicalRouter(sessions, handlers));
const server = createServer(app);
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const addr = server.address();
assert.ok(addr && typeof addr !== 'string');
const base = 'http://127.0.0.1:' + addr.port;
const send = (path: string, token?: string) => fetch(base + path, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
  body: JSON.stringify({ fictional: true }),
});
try {
  const session = sessions.issue('fictional-doctor');
  for (const path of CLINICAL_PATHS) {
    assert.equal((await send(path)).status, 401, path + ': anonymous');
    assert.equal((await send(path, 'A'.repeat(43))).status, 401, path + ': invalid');
    assert.equal((await send(path, session.token)).status, 200, path + ': authorized');
  }
  assert.deepEqual(hits, [...CLINICAL_PATHS], 'No clinical handler should run for unauthorized requests');
  sessions.revoke(session.token);
  for (const path of CLINICAL_PATHS) assert.equal((await send(path, session.token)).status, 401, path + ': revoked');
  console.log('PASS: isolated protected clinical router rejects anonymous/invalid/revoked sessions on all 3 paths.');
  console.log('WARNING: this router is NOT mounted on live clinical routes.');
} finally {
  await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
}
