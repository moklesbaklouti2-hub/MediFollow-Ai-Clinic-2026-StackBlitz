// Static regression: login UI remains unmounted until backend session design is ready.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const form = readFileSync(new URL('../src/components/DoctorLogin.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
assert.match(form, /type="password"/);
assert.match(form, /autoComplete="current-password"/);
assert.match(form, /onSubmit=\{submit\}/);
assert.match(form, /role="alert"/);
assert.doesNotMatch(form, /localStorage|sessionStorage|console\.log|fetch\(/);
assert.doesNotMatch(app, /import DoctorLogin|<DoctorLogin/);
console.log('PASS: preparatory doctor login UI exists without browser token storage or premature mounting.');
