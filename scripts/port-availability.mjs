import { connect } from 'node:net';

// Treat all connection errors except a definitive refusal as unavailable.
export function isPortUnavailable(port, host = '127.0.0.1') {
  return new Promise(resolve => {
    const socket = connect({ host, port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', error => { socket.destroy(); resolve(error.code !== 'ECONNREFUSED'); });
  });
}
