import assert from 'node:assert/strict';
import { completeWithCloudflare } from './providers/cloudflare.ts';
import {
  createCompletionWithProviders,
  type AiProviderId,
} from './router.ts';

async function testCloudflareAdapter(): Promise<void> {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    throw new Error('Secrets Cloudflare absents : test réel de l’adaptateur impossible.');
  }

  const completion = await completeWithCloudflare({
    messages: [
      {
        role: 'user',
        content: 'Réponds uniquement avec le JSON demandé.',
      },
    ],
    temperature: 0,
    max_completion_tokens: 80,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'adapter_smoke_test',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            status: { type: 'string' },
          },
          required: ['status'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = completion.choices?.[0]?.message?.content;
  assert.equal(typeof content, 'string', 'Cloudflare doit renvoyer un contenu texte.');
  const parsed = JSON.parse(content);
  assert.equal(parsed.status, 'ok', 'La réponse JSON structurée doit contenir status=ok.');
  console.log('OK — Adaptateur Cloudflare : réponse JSON Schema exploitable.');
}

async function testAutomaticFallback(): Promise<void> {
  const calls: AiProviderId[] = [];
  const simulatedProviders = {
    groq: {
      id: 'groq' as const,
      isConfigured: () => true,
      complete: async () => {
        calls.push('groq');
        throw Object.assign(new Error('Quota simulé pour le test.'), { status: 429 });
      },
    },
    cloudflare: {
      id: 'cloudflare' as const,
      isConfigured: () => true,
      complete: async () => {
        calls.push('cloudflare');
        return { choices: [{ message: { content: 'secours-ok' } }] };
      },
    },
  };

  const result = await createCompletionWithProviders(
    { messages: [{ role: 'user', content: 'test' }] },
    'chat',
    simulatedProviders,
  );

  assert.deepEqual(calls, ['groq', 'cloudflare']);
  assert.equal(result.choices[0].message.content, 'secours-ok');
  console.log('OK — Basculement automatique : Groq 429 simulé → Cloudflare.');
}

async function main(): Promise<void> {
  await testCloudflareAdapter();
  await testAutomaticFallback();
  console.log('Tous les tests IA ciblés sont réussis.');
}

main().catch(error => {
  console.error('ÉCHEC DU TEST IA :', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
