import assert from 'node:assert/strict';
import { DoctorAuthError } from '../src/services/doctorAuthClient.ts';
import { postDoctorClinical } from '../src/services/doctorClinicalTransport.ts';

const originalFetch = globalThis.fetch;
const token = 'a'.repeat(64);
const calls: Array<{ path: string; init: RequestInit }> = [];
let csrfMode: 'valid' | 'expired' | 'invalid' | 'abort' = 'valid';
let clinicalStatus = 200;
const controller = new AbortController();

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const path = String(input);
  calls.push({ path, init: init ?? {} });
  if (path === '/api/auth/csrf') {
    if (csrfMode === 'expired') return new Response('', { status: 401 });
    if (csrfMode === 'invalid') return Response.json({ csrfToken: 'incorrect' });
    if (csrfMode === 'abort') {
      controller.abort();
      throw new DOMException('Aborted', 'AbortError');
    }
    return Response.json({ csrfToken: token });
  }
  if (clinicalStatus !== 200) return Response.json({ error: 'Accès refusé' }, { status: clinicalStatus });
  return Response.json({ synthetic: true });
}) as typeof fetch;

try {
  const paths = ['/api/clinical/analyze', '/api/commands/interpret', '/api/chat'] as const;
  for (const path of paths) {
    calls.length = 0;
    const response = await postDoctorClinical(path, { synthetic: 'no patient data' });
    assert.equal(response.status, 200);
    assert.deepEqual(calls.map(call => call.path), ['/api/auth/csrf', path]);
    const preflight = calls[0].init;
    const post = calls[1].init;
    assert.equal(preflight.method, 'GET');
    assert.equal(preflight.credentials, 'same-origin');
    assert.equal(preflight.cache, 'no-store');
    assert.equal(post.method, 'POST');
    assert.equal(post.credentials, 'same-origin');
    assert.equal(post.cache, 'no-store');
    assert.equal(post.redirect, 'error');
    assert.equal(new Headers(post.headers).get('x-medifollow-csrf'), token);
    assert.equal(new Headers(post.headers).has('authorization'), false);
    assert.equal(post.body, JSON.stringify({ synthetic: 'no patient data' }));
  }

  csrfMode = 'expired';
  calls.length = 0;
  await assert.rejects(
    postDoctorClinical('/api/chat', { synthetic: true }),
    (error: unknown) => error instanceof DoctorAuthError && error.status === 401,
  );
  assert.deepEqual(calls.map(call => call.path), ['/api/auth/csrf'], 'Do not fall back to an insecure clinical POST');

  csrfMode = 'invalid';
  calls.length = 0;
  await assert.rejects(
    postDoctorClinical('/api/chat', { synthetic: true }),
    (error: unknown) => error instanceof DoctorAuthError && error.status === 503,
  );
  assert.deepEqual(calls.map(call => call.path), ['/api/auth/csrf'], 'Invalid CSRF must block clinical POST');

  csrfMode = 'valid';
  clinicalStatus = 403;
  calls.length = 0;
  assert.equal((await postDoctorClinical('/api/chat', { synthetic: true })).status, 403);
  assert.equal(calls.length, 2, 'Do not retry protected POST without permission');

  csrfMode = 'abort';
  calls.length = 0;
  await assert.rejects(
    postDoctorClinical('/api/chat', { synthetic: true }, { signal: controller.signal }),
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
  );
  assert.deepEqual(calls.map(call => call.path), ['/api/auth/csrf'], 'Abort before sending clinical data');
  console.log('PASS: isolated browser clinical transport adds CSRF for 3 routes, fails closed, preserves abort.');
  console.log('WARNING: preparatory transport only, not wired into live React or production routes.');
} finally {
  globalThis.fetch = originalFetch;
}
