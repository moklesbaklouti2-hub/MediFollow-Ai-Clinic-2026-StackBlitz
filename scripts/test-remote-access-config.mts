import assert from 'node:assert/strict';
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
assert.throws(() => validateRemoteStartup({ REMOTE_ACCESS_MODE: 'enable' }));
assert.throws(() => validateRemoteStartup({ REMOTE_ACCESS_MODE: 'enabled', NODE_ENV: 'development', PUBLIC_ORIGIN: 'https://medifollow.example/', REMOTE_TRUST_PROXY: 'verified' }));
assert.throws(() => validateRemoteStartup({ REMOTE_ACCESS_MODE: 'enabled', NODE_ENV: 'production', PUBLIC_ORIGIN: 'http://medifollow.example/', REMOTE_TRUST_PROXY: 'verified' }));
assert.throws(() => validateRemoteStartup({ REMOTE_ACCESS_MODE: 'enabled', NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://medifollow.example/' }));
const ready = validateRemoteStartup({ REMOTE_ACCESS_MODE: 'enabled', NODE_ENV: 'production', PUBLIC_ORIGIN: 'https://medifollow.example/', REMOTE_TRUST_PROXY: 'verified' });
assert.equal(ready?.publicOrigin, 'https://medifollow.example');

console.log('PASS: remote HTTPS origin validation, explicit proxy configuration and local-only dev exception.');
console.log('WARNING: startup preflight is connected to server, but no real reverse proxy, authentication or deployment is enabled.');
