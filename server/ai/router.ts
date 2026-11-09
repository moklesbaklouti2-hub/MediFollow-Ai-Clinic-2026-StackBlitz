import { completeWithGroq, isGroqConfigured } from './providers/groq.ts';

export type AiTask = 'commands' | 'clinical' | 'chat';
export type AiProviderId = 'groq';

type ProviderAdapter = {
  id: AiProviderId;
  isConfigured: () => boolean;
  complete: (request: any) => Promise<any>;
};

/**
 * Registre central des fournisseurs.
 * Les prochains adaptateurs (Cloudflare, OpenRouter, Gemini) seront ajoutés ici,
 * sans modifier les routes HTTP ni le frontend.
 */
const providers: Record<AiProviderId, ProviderAdapter> = {
  groq: {
    id: 'groq',
    isConfigured: isGroqConfigured,
    complete: completeWithGroq,
  },
};

/** Ordre d'essai par catégorie. Pour cette première étape, Groq reste seul actif. */
const providerOrder: Record<AiTask, AiProviderId[]> = {
  commands: ['groq'],
  clinical: ['groq'],
  chat: ['groq'],
};

export function isAiProviderConfigured(): boolean {
  return Object.values(providers).some(provider => provider.isConfigured());
}

export function getAvailableAiProviders(): AiProviderId[] {
  return Object.values(providers)
    .filter(provider => provider.isConfigured())
    .map(provider => provider.id);
}

/**
 * Point d'entrée unique pour toutes les requêtes IA.
 * Les erreurs du fournisseur sont propagées pour préserver le statut HTTP,
 * les en-têtes de quota et les informations de temporisation.
 */
export async function createAiCompletion(request: any, task: AiTask = 'chat'): Promise<any> {
  const order = providerOrder[task];
  let lastError: unknown = null;

  for (const providerId of order) {
    const provider = providers[providerId];
    if (!provider.isConfigured()) continue;

    try {
      return await provider.complete(request);
    } catch (error) {
      lastError = error;
      throw error;
    }
  }

  if (lastError instanceof Error) throw lastError;

  const error = new Error('Aucun fournisseur IA configuré pour cette fonction.') as Error & {
    status: number;
    provider: string;
  };
  error.status = 503;
  error.provider = 'router';
  throw error;
}
