// Safety regression: the simulated role matrix must not be mistaken for runtime authorization.
// This is a static inspection, not a security certification.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');
const policy = readFileSync(new URL('../docs/ACCESS_CONTROL_MATRIX.md', import.meta.url), 'utf8');
const simulation = readFileSync(new URL('./test-access-decision-contract.mjs', import.meta.url), 'utf8');
assert.match(policy, /non implémentée/);
assert.match(simulation, /NOT connected to Express middleware/);
assert.doesNotMatch(server, /test-access-decision-contract|proposedAccessDecision/);
for (const route of ['/api/clinical/analyze', '/api/commands/interpret', '/api/chat']) {
  assert.ok(server.includes(route), 'Sensitive endpoint changed: ' + route);
}
console.log('PASS: proposed access decisions remain isolated from live API routes.');
console.log('WARNING: this test does NOT demonstrate that live API routes enforce authentication.');
