import assert from 'node:assert/strict';
import { createSessionStore } from '../server/security/sessionStore.ts';

let clock = 1000;
const store = createSessionStore({ ttlMs: 1000, now: () => clock });
assert.throws(() => createSessionStore({ ttlMs: 0 }));
assert.throws(() => store.issue(''));
const a = store.issue('fictional-doctor');
const b = store.issue('fictional-doctor');
assert.notEqual(a.token, b.token);
assert.equal(store.verify(a.token)?.role, 'doctor');
assert.equal(store.verify(a.token)?.subjectId, 'fictional-doctor');
assert.equal(store.verify('invalid'), null);
assert.equal(store.verify(undefined), null);
assert.equal(store.revoke(a.token), true);
assert.equal(store.verify(a.token), null);
assert.ok(store.verify(b.token));
clock = 2000;
assert.equal(store.verify(b.token), null);
const c = store.issue('fictional-doctor');
store.revokeAll();
assert.equal(store.verify(c.token), null);

// A moving clock must not create a mismatch between returned and stored expiry.
let ticks = 5000;
const moving = createSessionStore({ ttlMs: 1000, now: () => ticks++ });
const issued = moving.issue('fictional-doctor');
assert.equal(issued.expiresAt, 6000);
ticks = 5999;
assert.equal(moving.verify(issued.token)?.expiresAt, issued.expiresAt);
ticks = 6000;
assert.equal(moving.verify(issued.token), null);
assert.equal(moving.verify(issued.token), null);

// Capacity is enforced; older sessions become invalid when a new one is issued.
assert.throws(() => createSessionStore({ maxSessions: 0 }));
assert.throws(() => createSessionStore({ maxSessions: 101 }));
const bounded = createSessionStore({ maxSessions: 2 });
const oldest = bounded.issue('fictional-doctor');
const middle = bounded.issue('fictional-doctor');
const newest = bounded.issue('fictional-doctor');
assert.equal(bounded.verify(oldest.token), null);
assert.ok(bounded.verify(middle.token));
assert.ok(bounded.verify(newest.token));

// Expired entries must be removed before capacity-based eviction.
let boundedClock = 100;
const expiring = createSessionStore({ maxSessions: 2, ttlMs: 10, now: () => boundedClock });
const expired = expiring.issue('fictional-doctor');
boundedClock = 111;
const fresh = expiring.issue('fictional-doctor');
assert.equal(expiring.verify(expired.token), null);
assert.ok(expiring.verify(fresh.token));

// Non-finite clocks must fail closed instead of bypassing expiry comparisons.
for (const invalidClock of [NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
  let value = 1000;
  const invalid = createSessionStore({ ttlMs: 1000, now: () => value });
  const session = invalid.issue('fictional-doctor');
  value = invalidClock;
  assert.equal(invalid.verify(session.token), null, 'Invalid clock must reject verification');
  assert.throws(() => invalid.issue('fictional-doctor'), /Invalid session clock/);
  value = 2000;
  assert.equal(invalid.verify(session.token), null, 'Expiry must still be enforced after clock recovery');
}
const overflowing = createSessionStore({ ttlMs: 1000, now: () => Number.MAX_SAFE_INTEGER });
assert.throws(() => overflowing.issue('fictional-doctor'), /Invalid session clock/);

console.log('PASS: isolated session lifecycle issue/verify/revoke/expire/revokeAll; not production-wired.');
