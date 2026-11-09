type ProviderError = Error & {
  status: number;
  provider: string;
  headers?: Headers;
};

const CLOUDFLARE_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export function isCloudflareConfigured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_API_TOKEN?.trim() &&
    process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),
  );
}

function makeProviderError(message: string, status: number, headers?: Headers): ProviderError {
  const error = new Error(message) as ProviderError;
  error.status = status;
  error.provider = 'cloudflare';
  error.headers = headers;
  return error;
}

/**
 * Adaptateur REST Cloudflare Workers AI.
 * Le modèle Llama 3.3 sélectionné prend en charge le mode JSON.
 * Les secrets restent exclusivement dans les variables d'environnement du serveur.
 */
export async function completeWithCloudflare(request: any): Promise<any> {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

  if (!token || !accountId) {
    throw makeProviderError('Identifiants Cloudflare non configurés.', 503);
  }

  const body: Record<string, unknown> = {
    ...request,
    model: CLOUDFLARE_MODEL,
  };

  if (typeof request.max_completion_tokens === 'number') {
    body.max_tokens = request.max_completion_tokens;
    delete body.max_completion_tokens;
  }

  // Workers AI attend le JSON Schema directement, contrairement à l'enveloppe Groq.
  if (request.response_format?.type === 'json_schema') {
    const schema = request.response_format.json_schema?.schema;
    if (!schema || typeof schema !== 'object') {
      throw makeProviderError('Schéma JSON incompatible avec Cloudflare.', 400);
    }
    body.response_format = {
      type: 'json_schema',
      json_schema: schema,
    };
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Erreur réseau Cloudflare.';
    throw makeProviderError(message, 503);
  }

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) {
    const message = payload?.error?.message ||
      payload?.errors?.[0]?.message ||
      `Erreur Cloudflare HTTP ${response.status}`;
    throw makeProviderError(String(message), response.status, response.headers);
  }

  if (!payload || !Array.isArray(payload.choices)) {
    throw makeProviderError('Réponse Cloudflare incompatible avec le format Chat Completions.', 502, response.headers);
  }

  return payload;
}
