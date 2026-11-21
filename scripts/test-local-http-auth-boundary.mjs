// Local-only HTTP probe using synthetic, non-identifying requests.
// This documents current exposure; it does NOT certify authentication.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { isPortUnavailable } from './port-availability.mjs';
import { setTimeout as delay } from 'node:timers/promises';

const base = 'http://127.0.0.1:3001';
// Never accept responses from an unrelated process already bound to the test port.
const occupied = await isPortUnavailable(3001);
assert.equal(occupied, false, 'Port 3001 already in use or unavailable; refusing a false-positive HTTP probe');

const child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server/index.ts'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, GROQ_API_KEY: '', CLOUDFLARE_API_TOKEN: '', OPENROUTER_API_KEY: '' },
});
let output = '';
child.stdout.on('data', chunk => { output += chunk.toString().slice(0, 500); });
child.stderr.on('data', chunk => { output += chunk.toString().slice(0, 500); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (child.exitCode !== null) throw new Error('Server exited before readiness');
    try {
      const health = await fetch(base + '/api/health', { signal: AbortSignal.timeout(500) });
      if (health.ok) { ready = true; break; }
    } catch { /* wait for startup */ }
    await delay(200);
  }
  assert.ok(ready, 'Local Express server did not become ready');
  const health = await fetch(base + '/api/health');
  assert.equal(health.status, 200);
  const invalid = await fetch(base + '/api/clinical/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ context: null }),
  });
  // A 400 rather than 401/403 demonstrates missing auth on this path.
  assert.equal(invalid.status, 400, 'Unexpected access boundary: inspect authentication before updating test');
  assert.equal((await invalid.json()).error, 'Contexte clinique invalide.');
  const command = await fetch(base + '/api/commands/interpret', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ instruction: '' }),
  });
  assert.equal(command.status, 400, 'Unexpected access boundary on command route');
  assert.equal((await command.json()).error, 'Commande vide.');
  console.log('HTTP local: health 200; clinical and command invalid payloads 400 WITHOUT authentication. DEPLOYMENT BLOCKER.');
} finally {
  child.kill('SIGTERM');
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(2000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}
