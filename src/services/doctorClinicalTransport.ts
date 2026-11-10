// Opt-in transport for the three clinical POST routes.
// Normal local mode preserves existing requests; any nonempty auth mode fails
// closed unless it is explicitly the secure cookie integration preview.
import { DoctorAuthError, getDoctorCsrfToken } from './doctorAuthClient';
import {
  doctorAuthPreviewEnabled,
  doctorAuthRequested,
  notifyDoctorSessionInvalid,
} from './doctorAuthMode';

export type ProtectedClinicalPath =
  | '/api/clinical/analyze'
  | '/api/commands/interpret'
  | '/api/chat';

type ClinicalOptions = { signal?: AbortSignal };

export async function postDoctorClinical(
  path: ProtectedClinicalPath,
  body: unknown,
  options: ClinicalOptions = {},
): Promise<Response> {
  let csrfToken: string;
  try {
    csrfToken = await getDoctorCsrfToken(options.signal);
  } catch (error) {
    if (error instanceof DoctorAuthError && (error.status === 401 || error.status === 403)) {
      notifyDoctorSessionInvalid();
    }
    // Never send medical content if authentication/CSRF preflight fails.
    throw error;
  }

  const response = await fetch(path, {
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
  if (response.status === 401 || response.status === 403) {
    notifyDoctorSessionInvalid();
  }
  return response;
}

export async function sendClinicalRequest(
  path: ProtectedClinicalPath,
  body: unknown,
  options: ClinicalOptions = {},
): Promise<Response> {
  if (doctorAuthRequested) {
    if (!doctorAuthPreviewEnabled || typeof window === 'undefined' ||
        window.location.protocol !== 'https:') {
      throw new DoctorAuthError(403, 'Mode de connexion sécurisé indisponible.');
    }
    return postDoctorClinical(path, body, options);
  }
  // Existing local development behavior is preserved, without browser tokens.
  // Local mode is NOT suitable for exposing clinical data to the Internet.
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: options.signal,
    body: JSON.stringify(body),
  });
}
