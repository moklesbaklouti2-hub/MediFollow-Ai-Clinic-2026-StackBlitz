import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { isPortUnavailable } from './port-availability.mjs';

const server = createServer();
await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
const port = server.address().port;
try {
  assert.equal(await isPortUnavailable(port), true, 'Occupied port must be rejected');
} finally {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
assert.equal(await isPortUnavailable(port), false, 'Released port must be available');
console.log('PASS: occupied port rejected and released port accepted (loopback only).');
