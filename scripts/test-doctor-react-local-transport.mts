import assert from 'node:assert/strict';
import { sendClinicalRequest } from '../src/services/doctorClinicalTransport.ts';

// No Vite preview flag exists in Node. This proves the default transport
// preserves local development requests without a CSRF preflight.
const originalFetch = globalThis.fetch;
const calls: Array<{ path: string; init: RequestInit }> = [];
globalThis.fetch = (async (path: RequestInfo | URL, init?: RequestInit) => {
  calls.push({ path: String(path), init: init ?? {} });
  return Response.json({ synthetic: true });
}) as typeof fetch;
try {
  for (const path of ['/api/clinical/analyze', '/api/commands/interpret', '/api/chat'] as const) {
    calls.length = 0;
    const payload = { fictional: true };
    assert.equal((await sendClinicalRequest(path, payload)).status, 200);
    assert.deepEqual(calls.map(call => call.path), [path],
      'Default local mode must not contact cookie auth endpoints');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(new Headers(calls[0].init.headers).get('content-type'), 'application/json');
    assert.equal(calls[0].init.body, JSON.stringify(payload));
    assert.equal(new Headers(calls[0].init.headers).has('authorization'), false);
  }
  console.log('PASS: default clinical transport for all 3 paths unchanged in local development.');
} finally {
  globalThis.fetch = originalFetch;
}
