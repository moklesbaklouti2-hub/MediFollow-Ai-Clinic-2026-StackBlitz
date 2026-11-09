import assert from 'node:assert/strict';
import { completeWithCloudflare } from './providers/cloudflare.ts';
import { completeWithOpenRouter } from './providers/openrouter.ts';
import {
  createCompletionWithProviders,
  type AiProviderId,
} from './router.ts';

async function testCloudflareAdapter(): Promise<void> {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    throw new Error('Secrets Cloudflare absents : test réel de l’adaptateur impossible.');
  }

  const completion = await completeWithCloudflare({
    messages: [{ role: 'user', content: 'Réponds uniquement avec ce JSON exact : {"status":"ok"}.' }],
    temperature: 0,
    max_completion_tokens: 80,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'adapter_smoke_test',
        strict: true,
        schema: {
          type: 'object',
          properties: { status: { type: 'string' } },
          required: ['status'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = completion.choices?.[0]?.message?.content;
  assert.equal(typeof content, 'string', 'Cloudflare doit renvoyer un contenu texte.');
  assert.equal(JSON.parse(content).status, 'ok');
  console.log('OK — Adaptateur Cloudflare : réponse JSON Schema exploitable.');
}

async function testOpenRouterAdapter(): Promise<void> {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.log('IGNORÉ — Test réel OpenRouter : OPENROUTER_API_KEY non configurée.');
    return;
  }

  const completion = await completeWithOpenRouter({
    messages: [{ role: 'user', content: 'Réponds uniquement par le mot OK.' }],
    temperature: 0,
    max_completion_tokens: 40,
  });
  const content = completion.choices?.[0]?.message?.content;
  assert.equal(typeof content, 'string', 'OpenRouter doit renvoyer un contenu texte.');
  assert.ok(content.trim().length > 0, 'La réponse OpenRouter ne doit pas être vide.');
  console.log('OK — Adaptateur OpenRouter : réponse réelle reçue.');
}

async function testThreeProviderFallback(): Promise<void> {
  const calls: AiProviderId[] = [];
  const simulatedProviders = {
    groq: {
      id: 'groq' as const,
      isConfigured: () => true,
      complete: async () => {
        calls.push('groq');
        throw Object.assign(new Error('Quota Groq simulé.'), { status: 429 });
      },
    },
    cloudflare: {
      id: 'cloudflare' as const,
      isConfigured: () => true,
      complete: async () => {
        calls.push('cloudflare');
        throw Object.assign(new Error('Indisponibilité Cloudflare simulée.'), { status: 503 });
      },
    },
    openrouter: {
      id: 'openrouter' as const,
      isConfigured: () => true,
      complete: async () => {
        calls.push('openrouter');
        return { choices: [{ message: { content: 'troisieme-secours-ok' } }] };
      },
    },
  };

  const result = await createCompletionWithProviders(
    { messages: [{ role: 'user', content: 'test fictif' }] },
    'chat',
    simulatedProviders,
  );

  assert.deepEqual(calls, ['groq', 'cloudflare', 'openrouter']);
  assert.equal(result.choices[0].message.content, 'troisieme-secours-ok');
  console.log('OK — Basculement simulé : Groq 429 → Cloudflare 503 → OpenRouter.');
}

async function main(): Promise<void> {
  await testCloudflareAdapter();
  await testOpenRouterAdapter();
  await testThreeProviderFallback();
  console.log('Tous les tests IA ciblés sont terminés.');
}

main().catch(error => {
  console.error('ÉCHEC DU TEST IA :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
