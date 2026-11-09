import assert from 'node:assert/strict';
import { createCompletionWithProviders, type AiProviderId } from './router.ts';

const ids: AiProviderId[] = ['groq', 'cloudflare', 'openrouter'];
function fakeProviders(handler: (id: AiProviderId) => Promise<any>) {
  return Object.fromEntries(ids.map(id => [id, {
    id, isConfigured: () => true, complete: () => handler(id),
  }])) as any;
}

async function main() {
  for (const status of [400, 401, 403, 422, 429, 503]) {
    const calls: string[] = [];
    const result = await createCompletionWithProviders(
      { messages: [{ role: 'user', content: 'Cas fictif' }] },
      'chat',
      fakeProviders(async id => {
        calls.push(id);
        if (id === 'groq') throw Object.assign(new Error('Simulation'), { status });
        return { choices: [{ message: { content: 'OK' } }] };
      }),
    );
    assert.deepEqual(calls, ['groq', 'cloudflare']);
    assert.equal(result.choices[0].message.content, 'OK');
  }
  const calls: string[] = [];
  const result = await createCompletionWithProviders(
    { messages: [{ role: 'user', content: 'Cas fictif' }] },
    'chat',
    fakeProviders(async id => {
      calls.push(id);
      if (id === 'groq') return { choices: [] };
      if (id === 'cloudflare') return { choices: [{ message: { content: null } }] };
      return { choices: [{ message: { content: [{ text: 'OK' }] } }] };
    }),
  );
  assert.deepEqual(calls, ids);
  assert.equal(result.choices[0].message.content, 'OK');
  await assert.rejects(() => createCompletionWithProviders(
    { messages: [] }, 'chat',
    fakeProviders(async () => { throw Object.assign(new Error('Simulation indisponible'), { status: 503 }); }),
  ));
  console.log('OK — 8 scénarios de robustesse du routeur IA validés sans appels externes.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
