// Regression checks for the informational API exposure scanner.
// Does not claim API authentication is active or sufficient.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const script = new URL('./audit-api-exposure.mjs', import.meta.url);
const source = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');
const scan = spawnSync(process.execPath, [script.pathname], { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } });
assert.equal(scan.status, 0, scan.stderr || scan.stdout);
assert.match(scan.stdout, /API inventory \(static\):/);
assert.match(scan.stdout, /Security findings \(review required\):/);
assert.match(scan.stdout, /does not prove absence or presence of route-level protections/);
for (const route of ['/api/clinical/analyze', '/api/commands/interpret', '/api/chat']) {
  assert.ok(source.includes(route), 'Critical route absent or renamed: '+route);
  assert.ok(scan.stdout.includes(route), 'Critical route missing from security inventory: '+route);
}
const recognizedGlobalAuth = /app\.use\(['"]\/api['"]\s*,\s*(?:requireAuth|authenticate|authMiddleware|verifyToken)\b/.test(source);
if (!recognizedGlobalAuth) assert.match(scan.stdout, /No recognizable global \/api authentication middleware/);
console.log('PASS: security inventory covers sensitive routes and transparently warns when no global auth is recognized.');
console.log('No real patient data used; not a penetration test or deployment authorization.');
