import { completeWithGroq, isGroqConfigured } from './providers/groq.ts';
import { completeWithCloudflare, isCloudflareConfigured } from './providers/cloudflare.ts';

export type AiTask = 'commands' | 'clinical' | 'chat';
export type AiProviderId = 'groq' | 'cloudflare';

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
};

/** Groq reste prioritaire ; Cloudflare est le premier secours configuré. */
const providerOrder: Record<AiTask, AiProviderId[]> = {
  commands: ['groq', 'cloudflare'],
  clinical: ['groq', 'cloudflare'],
  chat: ['groq', 'cloudflare'],
};

export function isAiProviderConfigured(): boolean {
  return Object.values(providers).some(provider => provider.isConfigured());
}

export function getAvailableAiProviders(): AiProviderId[] {
  return Object.values(providers)
    .filter(provider => provider.isConfigured())
    .map(provider => provider.id);
}

function isTemporaryProviderFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' &&
    (status === 408 || status === 425 || status === 429 || status >= 500);
}

/**
 * Exécuteur injectable : permet de tester le basculement sans consommer de quota
 * ni provoquer volontairement une panne réelle chez un fournisseur.
 */
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
      return await provider.complete(request);
    } catch (error) {
      lastError = error;
      if (!isTemporaryProviderFailure(error)) {
        throw error;
      }
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
