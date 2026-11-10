// Browser-only feature gate. Invalid nonempty settings must never silently
// fall back to unprotected clinical requests.
const configuredMode = import.meta.env?.VITE_DOCTOR_AUTH_MODE ?? '';
export const doctorAuthRequested = configuredMode !== '';
export const doctorAuthPreviewEnabled = configuredMode === 'integration-test';

type SessionListener = () => void;
export type DoctorCrossTabEvent = 'session-rejected' | 'logout-start' | 'logout-success';
type CrossTabListener = (event: DoctorCrossTabEvent) => void;

const expiredListeners = new Set<SessionListener>();
const crossTabListeners = new Set<CrossTabListener>();
const channelName = 'medifollow-doctor-session-events';
let channel: BroadcastChannel | null = null;

// BroadcastChannel transfers ONLY fixed event names: never passwords, CSRF
// values, clinical content or session identifiers. The local session remains
// authoritative and every foreground tab revalidates it with the server.
function getChannel(): BroadcastChannel | null {
  if (!doctorAuthPreviewEnabled || typeof window === 'undefined' ||
      typeof window.BroadcastChannel !== 'function') return null;
  if (!channel) {
    channel = new window.BroadcastChannel(channelName);
    channel.onmessage = (message: MessageEvent<unknown>) => {
      const type = message.data;
      if (type !== 'session-rejected' && type !== 'logout-start' && type !== 'logout-success') return;
      // Receiving an event never rebroadcasts it: avoid echo loops.
      for (const listener of crossTabListeners) listener(type);
    };
  }
  return channel;
}

export function subscribeDoctorSessionInvalid(listener: SessionListener): () => void {
  expiredListeners.add(listener);
  return () => { expiredListeners.delete(listener); };
}

export function subscribeDoctorCrossTab(listener: CrossTabListener): () => void {
  crossTabListeners.add(listener);
  getChannel();
  return () => {
    crossTabListeners.delete(listener);
    if (crossTabListeners.size === 0 && channel) {
      channel.close();
      channel = null;
    }
  };
}

export function broadcastDoctorSessionEvent(type: DoctorCrossTabEvent): void {
  getChannel()?.postMessage(type);
}

export function notifyDoctorSessionInvalid(): void {
  for (const listener of expiredListeners) listener();
  broadcastDoctorSessionEvent('session-rejected');
}
