// Preparatory HTTPS/origin configuration validator. NOT mounted in production.
// This rejects unsafe remote deployment configuration before credentials are enabled.
export type RemoteAccessConfig = { publicOrigin: string; trustProxy: boolean };

export function validateRemoteAccessConfig(input: {
  publicOrigin?: string;
  trustProxy?: boolean;
  production?: boolean;
}): RemoteAccessConfig {
  const value = input.publicOrigin;
  if (!value || typeof value !== 'string') throw new Error('PUBLIC_ORIGIN is required');
  let origin: URL;
  try { origin = new URL(value); } catch { throw new Error('Invalid PUBLIC_ORIGIN'); }
  if (origin.username || origin.password || origin.search || origin.hash ||
      origin.pathname !== '/' || origin.origin + '/' !== value) {
    throw new Error('PUBLIC_ORIGIN must be an exact origin without credentials, path, query or fragment');
  }
  const isLocal = origin.hostname === 'localhost' || origin.hostname === '127.0.0.1';
  if (origin.protocol !== 'https:' && !(input.production === false && isLocal && origin.protocol === 'http:')) {
    throw new Error('HTTPS is required for remote access');
  }
  if (input.production !== false && isLocal) throw new Error('Public production origin cannot be localhost');
  if (input.production !== false && input.trustProxy !== true) {
    throw new Error('Production reverse proxy configuration must be explicitly verified');
  }
  return { publicOrigin: origin.origin, trustProxy: input.trustProxy === true };
}

export function originMatches(requestOrigin: unknown, configuredOrigin: string): boolean {
  if (typeof requestOrigin !== 'string' || requestOrigin.length > 2048) return false;
  return requestOrigin === configuredOrigin;
}
