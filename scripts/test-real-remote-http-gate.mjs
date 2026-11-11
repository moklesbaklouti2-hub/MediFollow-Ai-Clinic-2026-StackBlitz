// Real Express HTTP regression for remote-mode fail-closed behavior.
// Synthetic requests only. No AI keys, patient data, credentials or public exposure.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

const base = 'http://127.0.0.1:3001';
const occupied = await new Promise(resolve => {
  const socket = connect({ host: '127.0.0.1', port: 3001 });
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', error => { socket.destroy(); resolve(error.code !== 'ECONNREFUSED'); });
});
assert.equal(occupied, false, 'Port 3001 occupied: cannot attribute responses to this test server');

const child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server/index.ts'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'production',
    REMOTE_ACCESS_MODE: 'enabled',
    PUBLIC_ORIGIN: 'https://medifollow.example/',
    REMOTE_TRUST_PROXY: 'verified',
    GROQ_API_KEY: '',
    CLOUDFLARE_API_TOKEN: '',
    OPENROUTER_API_KEY: '',
  },
});
let output = '';
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', chunk => { output = (output + chunk.toString()).slice(-3000); });
}
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null) throw new Error('Server exited: ' + output);
    try {
      const health = await fetch(base + '/api/health', { signal: AbortSignal.timeout(500) });
      if (health.status === 200) { ready = true; break; }
    } catch { /* starting */ }
    await delay(200);
  }
  assert.ok(ready, 'Express remote test server not ready: ' + output);
  const paths = ['/api/clinical/analyze', '/api/commands/interpret', '/api/chat'];
  for (const path of paths) {
    for (const authorization of [undefined, 'Bearer ' + 'A'.repeat(43)]) {
      const response = await fetch(base + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
        body: JSON.stringify({ fictional: true }),
      });
      assert.equal(response.status, 503, path + ' must fail closed in remote mode');
      assert.match((await response.json()).error, /authentification non activée/i);
    }
  }
  console.log('PASS: real Express remote mode returns 503 on all three clinical POST routes, anonymous and fake token.');
  console.log('WARNING: remote login is not yet implemented; this is an intentional deployment blocker.');
} finally {
  child.kill('SIGTERM');
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(2000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}
