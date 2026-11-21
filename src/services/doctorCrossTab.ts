// Small, testable browser-tab event hub. Never carries clinical data or tokens.
// Broadcasts only fixed "lock" events; it cannot grant or restore access.
export type DoctorCrossTabEvent = 'session-rejected' | 'logout-start' | 'logout-success';
type Channel = Pick<BroadcastChannel, 'onmessage' | 'postMessage' | 'close'>;
type Listener = (event: DoctorCrossTabEvent) => void;

function isSessionEvent(value: unknown): value is DoctorCrossTabEvent {
  return value === 'session-rejected' || value === 'logout-start' || value === 'logout-success';
}

export function createDoctorCrossTabHub(open: () => Channel | null) {
  const listeners = new Set<Listener>();
  let channel: Channel | null = null;

  const ensureChannel = (): Channel | null => {
    if (channel) return channel;
    channel = open();
    if (channel) {
      channel.onmessage = (message: MessageEvent<unknown>) => {
        if (!isSessionEvent(message.data)) return;
        // Incoming events never rebroadcast; remote events must not echo.
        for (const listener of listeners) listener(message.data);
      };
    }
    return channel;
  };

  return {
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      ensureChannel();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && channel) {
          channel.close();
          channel = null;
        }
      };
    },
    broadcast(event: DoctorCrossTabEvent): void {
      ensureChannel()?.postMessage(event);
    },
  };
}
