import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { validateRemoteAccessConfig, validateRemoteStartup, originMatches } from '../server/security/remoteAccessConfig.ts';

const production = validateRemoteAccessConfig({
  publicOrigin: 'https://medifollow.example/',
  trustProxy: true,
  production: true,
});
assert.equal(production.publicOrigin, 'https://medifollow.example');
assert.equal(originMatches('https://medifollow.example', production.publicOrigin), true);
assert.equal(originMatches('https://attacker.example', production.publicOrigin), false);
assert.equal(originMatches(undefined, production.publicOrigin), false);
assert.equal(originMatches('https://medifollow.example.attacker.example', production.publicOrigin), false);
assert.throws(() => validateRemoteAccessConfig({ publicOrigin: 'http://medifollow.example/', trustProxy: true, production: true }));
assert.throws(() => validateRemoteAccessConfig({ publicOrigin: 'https://medifollow.example/', production: true }));
assert.throws(() => validateRemoteAccessConfig({ publicOrigin: 'https://medifollow.example/path', trustProxy: true }));
assert.throws(() => validateRemoteAccessConfig({ publicOrigin: 'https://medifollow.example/?token=x', trustProxy: true }));
assert.throws(() => validateRemoteAccessConfig({ publicOrigin: 'https://user:pass@medifollow.example/', trustProxy: true }));
assert.throws(() => validateRemoteAccessConfig({ publicOrigin: 'http://localhost:3001/', production: true, trustProxy: true }));
const local = validateRemoteAccessConfig({ publicOrigin: 'http://127.0.0.1:3001/', production: false });
assert.equal(local.publicOrigin, 'http://127.0.0.1:3001');
assert.equal(validateRemoteStartup({}), null);
assert.equal(validateRemoteStartup({ REMOTE_ACCESS_MODE: '' }), null);
assert.equal(validateRemoteStartup({ NODE_ENV: 'development' }), null);
assert.equal(validateRemoteStartup({ NODE_ENV: 'test', REMOTE_ACCESS_MODE: '' }), null);
assert.throws(
  () => validateRemoteStartup({ NODE_ENV: 'production' }),
  /Production startup requires explicit REMOTE_ACCESS_MODE/,
);
assert.throws(
  () => validateRemoteStartup({ NODE_ENV: 'production', REMOTE_ACCESS_MODE: '' }),
  /Production startup requires explicit REMOTE_ACCESS_MODE/,
);

// Actual startup check, no network bind, fixture data only. A production
// server without an explicit remote access mode must exit BEFORE app.listen.
const refusedStartup = spawnSync(process.execPath,
  ['node_modules/tsx/dist/cli.mjs', 'server/index.ts'], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 15000,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      REMOTE_ACCESS_MODE: '',
      REMOTE_COOKIE_AUTH_MODE: '',
      GROQ_API_KEY: '',
      CLOUDFLARE_API_TOKEN: '',
      OPENROUTER_API_KEY: '',
    },
  });
assert.notEqual(refusedStartup.status, 0, 'Production server unexpectedly started without remote access mode');
assert.match(refusedStartup.stderr + refusedStartup.stdout,
  /Production startup requires explicit REMOTE_ACCESS_MODE/,
  'Production refusal must come from the access preflight, not a missing dependency or timeout');
assert.throws(() => validateRemoteStartup({ REMOTE_ACCESS_MODE: 'enable' }));
assert.throws(() => validateRemoteStartup({ REMOTE_ACCESS_MODE: 'enabled', NODE_ENV: 'development', PUBLIC_ORIGIN: 'https://medifollow.example/', REMOTE_TRUST_PROXY: 'verified' }));
assert.throws(() => validateRemoteStartup({ REMOTE_ACCESS_MODE: 'enabled', NODE_ENV: 'production', PUBLIC_ORIGIN: 'http://medifollow.example/', REMOTE_TRUST_PROXY: 'verified' }));
assert.throws(() => validateRemoteStartup({ REMOTE_ACCESS_MODE: 'enabled', NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://medifollow.example/' }));
const ready = validateRemoteStartup({ REMOTE_ACCESS_MODE: 'enabled', NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://medifollow.example/', REMOTE_TRUST_PROXY: 'verified' });
assert.equal(ready?.publicOrigin, 'https://medifollow.example');

console.log('PASS: remote HTTPS origin validation, explicit proxy configuration and local-only dev exception.');
console.log('PASS: production startup without explicit remote mode is refused before binding an HTTP port.');
console.log('WARNING: startup preflight is connected to server, but no real reverse proxy, authentication or deployment is enabled.');
