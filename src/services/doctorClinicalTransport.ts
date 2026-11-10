// Preparatory transport for the three protected clinical POST routes.
// NOT mounted in the live React workflows until the real server has cookie auth.
// Session cookies are browser-managed (HttpOnly); CSRF tokens stay in memory only.
import { getDoctorCsrfToken } from './doctorAuthClient';

export type ProtectedClinicalPath =
  | '/api/clinical/analyze'
  | '/api/commands/interpret'
  | '/api/chat';

export async function postDoctorClinical(
  path: ProtectedClinicalPath,
  body: unknown,
  options: { signal?: AbortSignal } = {},
): Promise<Response> {
  // Never bypass authentication when CSRF preflight fails (401/403/network).
  const csrfToken = await getDoctorCsrfToken(options.signal);
  return fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'error',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-medifollow-csrf': csrfToken,
    },
    body: JSON.stringify(body),
  });
}
