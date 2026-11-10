// Static fail-closed deployment gate; this is NOT a full HTTP security certification.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');
const gate = source.indexOf('if (remoteAccessConfig) {');
const firstRoute = source.indexOf("app.post('/api/clinical/analyze'");
assert.ok(gate > 0 && gate < firstRoute, 'Remote fail-closed gate must precede real clinical routes');
const guarded = source.slice(gate, firstRoute);
for (const path of ['/api/clinical/analyze', '/api/commands/interpret', '/api/chat']) {
  assert.ok(guarded.includes(path), 'Missing real route in fail-closed gate: ' + path);
}
assert.match(guarded, /req\.method !== 'POST'/);
assert.match(guarded, /res\.status\(503\)/);
assert.match(source, /const remoteAccessConfig = validateRemoteStartup\(process\.env\)/);
console.log('PASS: remote mode denies all three real clinical POST paths until authentication is integrated.');
console.log('WARNING: normal development mode remains unchanged and remote access is NOT ready.');
