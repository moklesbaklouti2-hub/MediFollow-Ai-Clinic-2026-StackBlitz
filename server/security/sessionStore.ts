// Preparatory in-memory session store. NOT wired to clinical routes.
// Session creation MUST follow a separately verified login mechanism.
// Restart invalidates all sessions. For multi-instance deployment use a shared store.
import { createHash, randomBytes } from 'node:crypto';

type Session = { subjectId: string; role: 'doctor'; expiresAt: number };
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export function createSessionStore(options: { ttlMs?: number; now?: () => number } = {}) {
  const ttlMs = options.ttlMs ?? 30 * 60 * 1000;
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > 24 * 60 * 60 * 1000) {
    throw new Error('Invalid session TTL');
  }
  const now = options.now ?? Date.now;
  const sessions = new Map<string, Session>();
  return {
    // Only call this after successful server-side credential verification.
    issue(subjectId: string) {
      if (!subjectId || subjectId.trim() !== subjectId || subjectId.length > 128) {
        throw new Error('Invalid subject');
      }
      const token = randomBytes(32).toString('base64url');
      const expiresAt = now() + ttlMs;
      sessions.set(hash(token), { subjectId, role: 'doctor', expiresAt });
      return { token, expiresAt };
    },
    verify(token: unknown): Session | null {
      if (typeof token !== 'string' || token.length !== 43 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
      const key = hash(token);
      // Map lookup is not constant-time; tokens are uniformly random and hashed at rest.
      const session = sessions.get(key);
      if (!session) return null;
      if (now() >= session.expiresAt) { sessions.delete(key); return null; }
      return { ...session };
    },
    revoke(token: unknown): boolean {
      if (typeof token !== 'string' || token.length !== 43) return false;
      return sessions.delete(hash(token));
    },
    revokeAll(): void { sessions.clear(); },
  };
}
