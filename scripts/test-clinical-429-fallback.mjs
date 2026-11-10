// Regression for the 429 fallback error parser in the clinical endpoint.
// Static source assertion; no live API, secrets or patient data used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');
const clinicalStart = source.indexOf("app.post('/api/clinical/analyze'");
const commandsStart = source.indexOf("app.post('/api/commands/interpret'");
assert.ok(clinicalStart >= 0 && commandsStart > clinicalStart, 'Clinical route boundaries changed');
const clinicalRoute = source.slice(clinicalStart, commandsStart);
const retryFallback = clinicalRoute.match(/if \(retryAfterSeconds === null\) \{\s*const detail = error instanceof Error \? error\.message : '';\s*const minutes = detail\.match\(/);
assert.ok(retryFallback, '429 fallback must define a safe local error detail before reading it');
assert.match(clinicalRoute, /return res\.status\(429\)\.json\(/, '429 response must remain available');
console.log('PASS: clinical 429 retry fallback defines detail before use (static regression).');
