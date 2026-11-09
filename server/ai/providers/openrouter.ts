type ProviderError = Error & {
  status: number;
  provider: string;
  headers?: Headers;
};

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function makeProviderError(message: string, status: number, headers?: Headers): ProviderError {
  const error = new Error(message) as ProviderError;
  error.status = status;
  error.provider = 'openrouter';
  error.headers = headers;
  return error;
}

/** Adaptateur REST OpenRouter compatible avec le format Chat Completions. */
export async function completeWithOpenRouter(request: any): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw makeProviderError('Clé OPENROUTER_API_KEY non configurée.', 503);
  }

  const model = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
  const body: Record<string, unknown> = {
    ...request,
    model,
  };

  // Normalise les limites de sortie utilisées par les autres adaptateurs.
  if (typeof request.max_completion_tokens === 'number') {
    body.max_tokens = request.max_completion_tokens;
    delete body.max_completion_tokens;
  }

  // Exige un endpoint capable de respecter les paramètres, notamment JSON Schema.
  if (request.response_format?.type === 'json_schema') {
    body.provider = {
      ...(request.provider && typeof request.provider === 'object' ? request.provider : {}),
      require_parameters: true,
    };
  }

  let response: Response;
  try {
    response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': 'MediFollow AI',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Erreur réseau OpenRouter.';
    throw makeProviderError(message, 503);
  }

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) {
    const message = payload?.error?.message ||
      payload?.message ||
      `Erreur OpenRouter HTTP ${response.status}`;
    throw makeProviderError(String(message), response.status, response.headers);
  }

  if (!payload || !Array.isArray(payload.choices)) {
    throw makeProviderError('Réponse OpenRouter incompatible avec le format Chat Completions.', 502, response.headers);
  }

  // Certains modèles OpenRouter renvoient un contenu structuré (objet ou
  // tableau de blocs) au lieu d'une chaîne. Normalise vers le format attendu
  // par MediFollow et par les autres adaptateurs OpenAI-compatibles.
  for (const choice of payload.choices) {
    const message = choice?.message;
    if (!message || message.content == null) continue;

    if (typeof message.content === 'string') continue;

    if (Array.isArray(message.content)) {
      message.content = message.content
        .map((part: any) => {
          if (typeof part === 'string') return part;
          if (typeof part?.text === 'string') return part.text;
          return '';
        })
        .filter(Boolean)
        .join('');
      continue;
    }

    if (typeof message.content === 'object') {
      message.content = typeof message.content.text === 'string'
        ? message.content.text
        : JSON.stringify(message.content);
      continue;
    }

    message.content = String(message.content);
  }

  return payload;
}
