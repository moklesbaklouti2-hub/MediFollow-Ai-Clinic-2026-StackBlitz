import assert from 'node:assert/strict';
import { validateRemoteAccessConfig, originMatches } from '../server/security/remoteAccessConfig.ts';

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
console.log('PASS: remote HTTPS origin validation, explicit proxy configuration and local-only dev exception.');
console.log('WARNING: validation module is NOT connected to real server or reverse proxy.');
