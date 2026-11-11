import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { isPortUnavailable } from './port-availability.mjs';

const server = createServer();
await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
const port = server.address().port;
try {
  // Independent concurrent probes must each detect the occupied loopback port.
  const occupied = await Promise.all(Array.from({ length: 5 }, () => isPortUnavailable(port)));
  assert.deepEqual(occupied, [true, true, true, true, true], 'Concurrent occupied-port probes must all reject');
  assert.equal(server.listening, true, 'Probes must not close the fixture listener');
} finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
const released = await Promise.all(Array.from({ length: 3 }, () => isPortUnavailable(port)));
assert.deepEqual(released, [false, false, false], 'Concurrent released-port probes must all accept');
console.log('PASS: concurrent occupied/released loopback probes and listener preservation.');
