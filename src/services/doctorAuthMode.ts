// Browser-only feature gate. Invalid nonempty settings must never silently
// fall back to unprotected clinical requests.
import { createDoctorCrossTabHub, type DoctorCrossTabEvent } from './doctorCrossTab';

const configuredMode = import.meta.env?.VITE_DOCTOR_AUTH_MODE ?? '';
export const doctorAuthRequested = configuredMode !== '';
export const doctorAuthPreviewEnabled = configuredMode === 'integration-test';

type SessionListener = () => void;
const expiredListeners = new Set<SessionListener>();
const channelName = 'medifollow-doctor-session-events';

const crossTabHub = createDoctorCrossTabHub(() => {
  if (!doctorAuthPreviewEnabled || typeof window === 'undefined' ||
      typeof window.BroadcastChannel !== 'function') return null;
  return new window.BroadcastChannel(channelName);
});

export function subscribeDoctorSessionInvalid(listener: SessionListener): () => void {
  expiredListeners.add(listener);
  return () => { expiredListeners.delete(listener); };
}

export function subscribeDoctorCrossTab(listener: (event: DoctorCrossTabEvent) => void): () => void {
  return crossTabHub.subscribe(listener);
}

export function broadcastDoctorSessionEvent(event: DoctorCrossTabEvent): void {
  crossTabHub.broadcast(event);
}

export function notifyDoctorSessionInvalid(): void {
  for (const listener of expiredListeners) listener();
  broadcastDoctorSessionEvent('session-rejected');
}
