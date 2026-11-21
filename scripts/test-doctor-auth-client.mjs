import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const client = readFileSync(new URL('../src/services/doctorAuthClient.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
assert.match(client, /credentials: 'same-origin'/);
assert.match(client, /cache: 'no-store'/);
assert.match(client, /redirect: 'error'/);
assert.match(client, /response\.status !== 204/);
assert.match(client, /getDoctorCsrfToken/);
assert.match(client, /'x-medifollow-csrf': csrfToken/);
assert.match(client, /fetch\('\/api\/auth\/csrf'/);
assert.match(client, /Connexion sécurisée par cookie non encore disponible/);
// Ignore explanatory comments: they intentionally mention forbidden APIs.
// Continue checking executable source for browser token persistence.
const executableClient = client.replace(/^\s*\/\/.*$/gm, '');
assert.doesNotMatch(executableClient, /localStorage|sessionStorage|document\.cookie|Authorization|Bearer/);
assert.doesNotMatch(app, /doctorAuthClient|loginDoctor|logoutDoctor/);
console.log('PASS: preparatory browser auth client is same-origin, cookie-only and not mounted.');
console.log('WARNING: React preview gate is opt-in and real Express cookie auth is loopback-only; not a public deployment.');
