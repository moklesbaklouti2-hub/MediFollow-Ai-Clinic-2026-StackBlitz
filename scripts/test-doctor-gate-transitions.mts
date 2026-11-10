import assert from 'node:assert/strict';
import { nextDoctorGatePhase as next } from '../src/services/doctorGateTransitions.ts';

assert.equal(next('verifying', 'verify-failure'), 'login', 'Expired session displays login');
assert.equal(next('verifying', 'verify-success'), 'authenticated', 'Verified session displays App');
assert.equal(next('login', 'login-success'), 'authenticated', 'Successful login displays App');
assert.equal(next('login', 'login-failure'), 'login', 'Bad password does not unlock');
assert.equal(next('authenticated', 'session-rejected'), 'login', '401/403 must unmount App');
assert.equal(next('authenticated', 'background'), 'locked', 'Android background must lock App');
assert.equal(next('locked', 'foreground'), 'verifying', 'Android foreground forces recheck');
assert.equal(next('locked', 'verify-success'), 'locked', 'Stale verify must not unlock on background');

// A logout starting in another tab must also interrupt a login/verification
// already underway. Its eventual 200 response must never reopen the UI.
for (const phase of ['verifying', 'login', 'locked'] as const) {
  const interrupted = next(phase, 'logout-start');
  assert.equal(interrupted, 'logout-pending', phase + ' must lock on another tab logout');
  assert.equal(next(interrupted, 'verify-success'), 'logout-pending',
    phase + ' stale CSRF verification must not reopen the app');
  assert.equal(next(interrupted, 'login-success'), 'logout-pending',
    phase + ' pending login must not reopen the app');
}
assert.equal(next('logout-pending', 'logout-success'), 'login',
  'Confirmed logout in another tab permits the login screen');

const pending = next('authenticated', 'logout-start');
assert.equal(pending, 'logout-pending', 'Logout unmounts App before network request');
assert.equal(next(pending, 'logout-failure'), 'logout-pending', 'Network failure must not reopen App');
assert.equal(next(pending, 'session-rejected'), 'logout-pending', 'Late 401 must not bypass pending revocation');
assert.equal(next(pending, 'verify-success'), 'logout-pending', 'Stale 200 must not reopen App');
assert.equal(next(pending, 'background'), 'logout-pending', 'Background must not skip logout');
assert.equal(next(pending, 'foreground'), 'logout-pending', 'Foreground must not skip logout');
assert.equal(next(pending, 'logout-start'), 'logout-pending', 'Retry must remain locked');
assert.equal(next(pending, 'logout-success'), 'login', 'Successful server revocation returns login');

const phases = ['verifying', 'login', 'authenticated', 'locked', 'logout-pending'] as const;
for (const phase of phases) {
  for (const event of ['logout-success', 'verify-success', 'login-success'] as const) {
    const result = next(phase, event);
    if (phase === 'logout-pending' && event === 'logout-success') assert.equal(result, 'login');
    if (phase === 'logout-pending' && event !== 'logout-success') assert.equal(result, 'logout-pending');
  }
}

console.log('PASS: doctor gate state machine locks on background, 401, failed logout; unlocks only on verified session.');
console.log('WARNING: pure state tests only, not an actual Android browser or public HTTPS test.');
