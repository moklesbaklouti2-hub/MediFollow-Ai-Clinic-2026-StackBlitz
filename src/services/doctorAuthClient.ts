// Preparatory browser auth client. NOT used by App until server-side cookie
// sessions, CSRF protection and real clinical route authorization are ready.
// Never put credentials or session tokens into localStorage or URLs.
export type DoctorAuthState = 'anonymous' | 'authenticated';

export class DoctorAuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'DoctorAuthError';
  }
}

async function authRequest(path: '/api/auth/login' | '/api/auth/logout', init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      headers: { 'content-type': 'application/json', ...init.headers },
    });
  } catch {
    throw new DoctorAuthError(0, 'Connexion au serveur impossible.');
  }
  if (response.status === 401) throw new DoctorAuthError(401, 'Identifiants ou session invalides.');
  if (response.status === 403) throw new DoctorAuthError(403, 'Accès refusé.');
  if (response.status === 429) throw new DoctorAuthError(429, 'Trop de tentatives. Réessayez plus tard.');
  if (!response.ok) throw new DoctorAuthError(response.status, 'Authentification temporairement indisponible.');
  return response;
}

export async function loginDoctor(username: string, password: string): Promise<void> {
  if (!username.trim() || !password) throw new DoctorAuthError(400, 'Identifiant et mot de passe requis.');
  const response = await authRequest('/api/auth/login', {
    body: JSON.stringify({ username: username.trim(), password }),
  });
  // Future production endpoint MUST set an HttpOnly Secure session cookie.
  // Reject the legacy JSON bearer-token response rather than retaining a token in JS.
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    throw new DoctorAuthError(503, 'Connexion sécurisée par cookie non encore disponible.');
  }
  if (response.status !== 204) {
    throw new DoctorAuthError(503, 'Réponse de connexion non prise en charge.');
  }
}

export async function logoutDoctor(): Promise<void> {
  const response = await authRequest('/api/auth/logout', {});
  if (response.status !== 204) {
    throw new DoctorAuthError(503, 'Déconnexion non confirmée.');
  }
}
