import assert from 'node:assert/strict';
import { hashDoctorPassword, verifyDoctorPassword } from '../server/security/doctorCredentials.ts';

const password = 'Fictional-only-test-password-2026!';
const first = await hashDoctorPassword(password);
const second = await hashDoctorPassword(password);
assert.notEqual(first, second, 'Random salt must differ');
assert.ok(first.startsWith('scrypt$v1$'));
assert.equal(await verifyDoctorPassword(password, first), true);
assert.equal(await verifyDoctorPassword('Incorrect-password-2026!', first), false);
assert.equal(await verifyDoctorPassword(password, 'invalid'), false);
assert.equal(await verifyDoctorPassword(null, first), false);
assert.equal(await verifyDoctorPassword(password, first.replace('scrypt$v1$', 'scrypt$v2$')), false);
await assert.rejects(() => hashDoctorPassword('short'));
console.log('PASS: isolated scrypt credentials with random salt, valid/invalid/malformed inputs.');
console.log('WARNING: login, rate limiting, and clinical-route authentication not yet connected.');
