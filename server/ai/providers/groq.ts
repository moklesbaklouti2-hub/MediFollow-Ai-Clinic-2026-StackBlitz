import Groq from 'groq-sdk';

let groqClient: Groq | null = null;
let configuredKey = '';

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error('Clé GROQ_API_KEY non configurée.') as Error & { status: number; provider: string };
    error.status = 503;
    error.provider = 'groq';
    throw error;
  }

  if (!groqClient || configuredKey !== apiKey) {
    groqClient = new Groq({ apiKey });
    configuredKey = apiKey;
  }

  return groqClient;
}

/**
 * Adaptateur Groq : seule cette couche connaît le SDK du fournisseur.
 * Les paramètres et la réponse restent compatibles avec les appels existants.
 */
export async function completeWithGroq(request: any): Promise<any> {
  return getGroqClient().chat.completions.create(request);
}
