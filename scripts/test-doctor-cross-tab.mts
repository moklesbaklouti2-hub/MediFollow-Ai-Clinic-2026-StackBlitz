import assert from 'node:assert/strict';
import { createDoctorCrossTabHub } from '../src/services/doctorCrossTab.ts';

class FakeChannel {
  static instances = new Set<FakeChannel>();
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  constructor(readonly name: string) { FakeChannel.instances.add(this); }
  postMessage(data: unknown): void {
    for (const peer of FakeChannel.instances) {
      if (peer !== this && peer.name === this.name) {
        peer.onmessage?.({ data } as MessageEvent<unknown>);
      }
    }
  }
  close(): void { FakeChannel.instances.delete(this); }
}
const name = 'synthetic-doctor-tab-event-test';
const a = createDoctorCrossTabHub(() => new FakeChannel(name) as unknown as BroadcastChannel);
const b = createDoctorCrossTabHub(() => new FakeChannel(name) as unknown as BroadcastChannel);

const receivedA: string[] = [];
const receivedB: string[] = [];
const unsubscribeA = a.subscribe(event => receivedA.push(event));
const unsubscribeB = b.subscribe(event => receivedB.push(event));

a.broadcast('logout-start');
assert.deepEqual(receivedA, [], 'Do not self-echo logout start');
assert.deepEqual(receivedB, ['logout-start'], 'Other tab must lock immediately');

b.broadcast('logout-success');
assert.deepEqual(receivedA, ['logout-success'], 'Server-confirmed revocation must reach the first tab');
assert.deepEqual(receivedB, ['logout-start'], 'Do not self-echo revocation');

a.broadcast('session-rejected');
assert.deepEqual(receivedB, ['logout-start', 'session-rejected'],
  'Session expiry must propagate across tabs');

// A forged non-enumerated message cannot unlock a clinical screen or leak data.
const outsider = new FakeChannel(name);
outsider.postMessage({ type: 'session-allowed', token: 'MUST_NOT_BE_USED' });
outsider.postMessage('session-allowed');
assert.deepEqual(receivedA, ['logout-success', 'session-rejected']);
assert.deepEqual(receivedB, ['logout-start', 'session-rejected']);
outsider.close();

unsubscribeA();
assert.equal(FakeChannel.instances.size, 1, 'Subscription cleanup closes the first tab channel');
b.broadcast('logout-start');
assert.deepEqual(receivedA, ['logout-success', 'session-rejected'],
  'Closed tab channel must not receive events');
unsubscribeB();
assert.equal(FakeChannel.instances.size, 0, 'No cross-tab channels should remain');

const receivedAgain: string[] = [];
const unsubscribeAgain = a.subscribe(event => receivedAgain.push(event));
const newPeer = new FakeChannel(name);
newPeer.postMessage('session-rejected');
assert.deepEqual(receivedAgain, ['session-rejected'], 'Reopened tab must receive events');
newPeer.close();
unsubscribeAgain();
assert.equal(FakeChannel.instances.size, 0);

console.log('PASS: token-free cross-tab logout and session rejection, no echo, invalid event ignored and channel cleanup.');
console.log('WARNING: mock channels only. Browser support and cross-device session revocation require separate tests.');
