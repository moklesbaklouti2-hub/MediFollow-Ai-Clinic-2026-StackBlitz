// Browser-only feature gate. Invalid non-empty settings must never silently
// fall back to unprotected clinical requests.
const configuredMode = import.meta.env?.VITE_DOCTOR_AUTH_MODE ?? '';
export const doctorAuthRequested = configuredMode !== '';
export const doctorAuthPreviewEnabled = configuredMode === 'integration-test';

type SessionListener = () => void;
const expiredListeners = new Set<SessionListener>();
export function subscribeDoctorSessionInvalid(listener: SessionListener): () => void {
  expiredListeners.add(listener);
  return () => { expiredListeners.delete(listener); };
}
export function notifyDoctorSessionInvalid(): void {
  for (const listener of expiredListeners) listener();
}
