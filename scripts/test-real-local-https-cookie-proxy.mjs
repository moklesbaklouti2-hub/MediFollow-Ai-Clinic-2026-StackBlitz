// Verified local TLS reverse-proxy regression for the REAL Express clinical routes.
// Synthetic credentials, ephemeral self-signed certificate, loopback listeners.
// NOT an Android browser test and NOT a public deployment configuration.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { connect } from 'node:net';
import { createServer as createHttpsServer, request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const origin = 'https://clinic.example';
const fictionalUsername = 'fictional-tls-doctor';
const fictionalPassword = 'Synthetic-HTTPS-fixture-only-2026!';
const salt = randomBytes(16);
const derived = scryptSync(fictionalPassword, salt, 64, {
  N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024,
});
const passwordHash = 'scrypt$v1$' + salt.toString('hex') + '$' + derived.toString('hex');
const dir = mkdtempSync(join(tmpdir(), 'medifollow-tls-fixture-'));
let child = null;
let proxy = null;
let output = '';

try {
  const keyPath = join(dir, 'temporary.key');
  const certPath = join(dir, 'temporary.crt');
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes',
    '-keyout', keyPath, '-out', certPath, '-subj', '/CN=clinic.example',
    '-addext', 'subjectAltName=DNS:clinic.example', '-days', '1',
  ], { stdio: 'ignore', timeout: 10000 });
  const key = readFileSync(keyPath);
  const cert = readFileSync(certPath);

  const occupied = await new Promise(resolve => {
    const socket = connect({ host: '127.0.0.1', port: 3001 });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', error => {
      socket.destroy();
      resolve(error.code !== 'ECONNREFUSED');
    });
  });
  assert.equal(occupied, false, 'Port 3001 in use: refusing an unrelated server response');

  child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server/index.ts'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      REMOTE_ACCESS_MODE: 'enabled',
      REMOTE_COOKIE_AUTH_MODE: 'integration-test',
      COOKIE_AUTH_TEST_ONLY_ACK: 'synthetic-fixture-only',
      PUBLIC_ORIGIN: origin + '/',
      REMOTE_TRUST_PROXY: 'verified',
      DOCTOR_USERNAME: fictionalUsername,
      DOCTOR_PASSWORD_HASH: passwordHash,
      GROQ_API_KEY: '',
      CLOUDFLARE_API_TOKEN: '',
      OPENROUTER_API_KEY: '',
    },
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', chunk => { output = (output + chunk.toString()).slice(-2000); });
  }
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error('Real Express fixture exited: ' + output);
    try {
      const health = await fetch('http://127.0.0.1:3001/api/health', {
        signal: AbortSignal.timeout(400),
      });
      if (health.status === 200) { ready = true; break; }
    } catch { /* startup */ }
    await delay(150);
  }
  assert.ok(ready, 'Express fixture did not become ready: ' + output);

  // Minimal HTTPS reverse proxy on localhost. Never forward untrusted X-Forwarded-*
  // headers from the client; enforce a single known upstream and trusted scheme.
  proxy = createHttpsServer({ key, cert }, (req, res) => {
    if (!req.url?.startsWith('/api/')) {
      res.writeHead(404); res.end(); return;
    }
    const headers = { ...req.headers };
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase().startsWith('x-forwarded-')) delete headers[name];
    }
    headers['host'] = 'clinic.example';
    headers['x-forwarded-proto'] = 'https';
    const upstream = httpRequest({
      hostname: '127.0.0.1', port: 3001, path: req.url,
      method: req.method, headers,
    }, response => {
      res.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(res);
    });
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  });
  await new Promise((resolve, reject) => {
    proxy.once('error', reject);
    proxy.listen(0, '127.0.0.1', resolve);
  });
  const address = proxy.address();
  assert.ok(address && typeof address !== 'string');
  const httpsPort = address.port;

  const tlsRequest = (path, { method = 'POST', body, cookie, csrf, requestOrigin = origin } = {}) =>
    new Promise((resolve, reject) => {
      const headers = { host: 'clinic.example' };
      if (requestOrigin !== null) headers['origin'] = requestOrigin;
      if (body !== undefined) headers['content-type'] = 'application/json';
      if (cookie) headers['cookie'] = cookie;
      if (csrf) headers['x-medifollow-csrf'] = csrf;
      const client = httpsRequest({
        hostname: '127.0.0.1', port: httpsPort, path, method, headers,
        servername: 'clinic.example', ca: cert, rejectUnauthorized: true,
      }, response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.once('end', () => resolve({
          status: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString('utf8'),
          authorized: response.socket.authorized,
        }));
      });
      client.setTimeout(7000, () => client.destroy(new Error('TLS fixture request timed out')));
      client.once('error', reject);
      client.end(body === undefined ? undefined : JSON.stringify(body));
    });

  const loginBody = { username: fictionalUsername, password: fictionalPassword };
  const anonymous = await tlsRequest('/api/clinical/analyze', { body: { context: null } });
  assert.equal(anonymous.authorized, true, 'Self-signed local certificate must verify against fixture CA');
  assert.equal(anonymous.status, 401, 'Anonymous real clinical API must fail over verified TLS');

  const foreignLogin = await tlsRequest('/api/auth/login', {
    body: loginBody, requestOrigin: 'https://attacker.example',
  });
  assert.equal(foreignLogin.status, 403, 'Mismatched Origin must be rejected over TLS');

  const login = await tlsRequest('/api/auth/login', { body: loginBody });
  assert.equal(login.authorized, true, 'TLS handshake must be verified');
  assert.equal(login.status, 204);
  assert.equal(login.body, '', 'Login must not expose bearer token');
  const setCookie = login.headers['set-cookie']?.[0] ?? '';
  assert.match(setCookie, /^__Host-medifollow_session=[A-Za-z0-9_-]{43};/);
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/']) {
    assert.ok(setCookie.includes(attribute), 'Session cookie must include ' + attribute);
  }
  const cookie = setCookie.split(';')[0];
  const csrf = await tlsRequest('/api/auth/csrf', { method: 'GET', cookie, requestOrigin: null });
  assert.equal(csrf.status, 200);
  assert.equal(csrf.headers['cache-control'], 'no-store');
  const { csrfToken } = JSON.parse(csrf.body);
  assert.match(csrfToken, /^[a-f0-9]{64}$/);

  const clinical = [
    { path: '/api/clinical/analyze', body: { context: null }, expected: 'Contexte clinique invalide.' },
    { path: '/api/commands/interpret', body: { instruction: '' }, expected: 'Commande vide.' },
    { path: '/api/chat', body: { message: '' }, expected: 'Message vide.' },
  ];
  for (const item of clinical) {
    assert.equal((await tlsRequest(item.path, { body: item.body, cookie })).status, 403,
      item.path + ' requires CSRF');
    assert.equal((await tlsRequest(item.path, {
      body: item.body, cookie, csrf: csrfToken, requestOrigin: 'https://attacker.example',
    })).status, 403, item.path + ' must reject foreign origin');
    const authorized = await tlsRequest(item.path, { body: item.body, cookie, csrf: csrfToken });
    assert.equal(authorized.status, 400, item.path + ' must reach real validation only after auth');
    assert.equal(JSON.parse(authorized.body).error, item.expected);
  }

  const logout = await tlsRequest('/api/auth/logout', { cookie, csrf: csrfToken });
  assert.equal(logout.status, 204);
  assert.match(logout.headers['set-cookie']?.[0] ?? '', /Max-Age=0/);
  for (const item of clinical) {
    assert.equal((await tlsRequest(item.path, { body: item.body, cookie, csrf: csrfToken })).status,
      401, item.path + ' revoked session must fail');
  }
  console.log('PASS: verified local TLS + proxy + real Express cookie login, CSRF, clinical routes and revocation.');
  console.log('WARNING: synthetic CA and loopback only; no Android browser or public HTTPS deployment tested.');
} finally {
  if (proxy) {
    await Promise.race([
      new Promise(resolve => proxy.close(resolve)),
      delay(2000),
    ]);
    proxy.closeAllConnections();
  }
  if (child) {
    child.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      delay(2000),
    ]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
  rmSync(dir, { recursive: true, force: true });
}
