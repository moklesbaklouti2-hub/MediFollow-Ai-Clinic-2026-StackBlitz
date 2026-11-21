import { connect } from 'node:net';

// Treat all connection errors except a definitive refusal as unavailable.
// A stalled probe must fail closed instead of hanging a CI run indefinitely.
export function isPortUnavailable(port, host = '127.0.0.1', timeoutMs = 1500) {
  return new Promise(resolve => {
    const socket = connect({ host, port });
    let settled = false;
    const finish = unavailable => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(unavailable);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('error', error => finish(error.code !== 'ECONNREFUSED'));
    socket.once('timeout', () => finish(true));
  });
}
