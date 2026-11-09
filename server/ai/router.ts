import { completeWithGroq, isGroqConfigured } from './providers/groq.ts';
import { completeWithCloudflare, isCloudflareConfigured } from './providers/cloudflare.ts';
import { completeWithOpenRouter, isOpenRouterConfigured } from './providers/openrouter.ts';

export type AiTask = 'commands' | 'clinical' | 'chat';
export type AiProviderId = 'groq' | 'cloudflare' | 'openrouter';

type ProviderAdapter = {
  id: AiProviderId;
  isConfigured: () => boolean;
  complete: (request: any) => Promise<any>;
};

type ProviderRegistry = Record<AiProviderId, ProviderAdapter>;

const providers: ProviderRegistry = {
  groq: {
    id: 'groq',
    isConfigured: isGroqConfigured,
    complete: completeWithGroq,
  },
  cloudflare: {
    id: 'cloudflare',
    isConfigured: isCloudflareConfigured,
    complete: completeWithCloudflare,
  },
  openrouter: {
    id: 'openrouter',
    isConfigured: isOpenRouterConfigured,
    complete: completeWithOpenRouter,
  },
};

/** Ordre de priorité : Groq, puis Cloudflare, puis OpenRouter. */
const providerOrder: Record<AiTask, AiProviderId[]> = {
  commands: ['groq', 'cloudflare', 'openrouter'],
  clinical: ['groq', 'cloudflare', 'openrouter'],
  chat: ['groq', 'cloudflare', 'openrouter'],
};

export function isAiProviderConfigured(): boolean {
  return Object.values(providers).some(provider => provider.isConfigured());
}

export function getAvailableAiProviders(): AiProviderId[] {
  return Object.values(providers)
    .filter(provider => provider.isConfigured())
    .map(provider => provider.id);
}

function providerStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

function canTryAnotherProvider(error: unknown): boolean {
  const status = providerStatus(error);
  // 400/404/422 : paramètres ou modèle incompatibles avec un fournisseur.
  // 401/403 : configuration ou droits de ce fournisseur. Ne pas bloquer
  // les autres fournisseurs configurés pour ces erreurs.
  return status === undefined || [400, 401, 403, 404, 408, 409, 422, 425, 429].includes(status) || status >= 500;
}

function normalizeCompletion(response: any): any {
  if (!Array.isArray(response?.choices) || !response.choices.length) {
    throw Object.assign(new Error('Réponse IA sans choix exploitable.'), { status: 502 });
  }
  for (const choice of response.choices) {
    const message = choice?.message;
    if (!message) continue;
    if (Array.isArray(message.content)) {
      message.content = message.content.map((part: any) =>
        typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : ''
      ).join('');
    } else if (message.content && typeof message.content === 'object') {
      message.content = typeof message.content.text === 'string'
        ? message.content.text : JSON.stringify(message.content);
    }
  }
  if (typeof response.choices[0]?.message?.content !== 'string' ||
      !response.choices[0].message.content.trim()) {
    throw Object.assign(new Error('Réponse IA vide ou incompatible.'), { status: 502 });
  }
  return response;
}

/** Exécuteur injectable pour tester les basculements sans provoquer de panne réelle. */
export async function createCompletionWithProviders(
  request: any,
  task: AiTask = 'chat',
  providerRegistry: ProviderRegistry = providers,
): Promise<any> {
  const order = providerOrder[task];
  let lastError: unknown = null;
  let attemptedProvider = false;

  for (const providerId of order) {
    const provider = providerRegistry[providerId];
    if (!provider.isConfigured()) continue;

    attemptedProvider = true;
    try {
      return normalizeCompletion(await provider.complete(request));
    } catch (error) {
      lastError = error;
      if (!canTryAnotherProvider(error)) throw error;
      console.warn(
        `Fournisseur IA ${providerId} temporairement indisponible pour la tâche ${task}; tentative du fournisseur suivant.`,
      );
    }
  }

  if (lastError instanceof Error) throw lastError;

  const error = new Error(
    attemptedProvider
      ? 'Tous les fournisseurs IA configurés sont temporairement indisponibles.'
      : 'Aucun fournisseur IA configuré pour cette fonction.',
  ) as Error & { status: number; provider: string };
  error.status = 503;
  error.provider = 'router';
  throw error;
}

export function createAiCompletion(request: any, task: AiTask = 'chat'): Promise<any> {
  return createCompletionWithProviders(request, task);
}
