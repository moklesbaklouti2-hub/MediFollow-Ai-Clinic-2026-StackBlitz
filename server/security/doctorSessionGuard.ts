// Session-based route guard, prepared but NOT mounted on the clinical API.
// A session must only be issued after server-side credential verification.
import type { RequestHandler } from 'express';
import { createSessionStore } from './sessionStore.ts';

type Store = ReturnType<typeof createSessionStore>;

export function createDoctorSessionGuard(store: Store): RequestHandler {
  return (req, res, next) => {
    const header = req.get('authorization') ?? '';
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(header);
    if (!match) {
      res.status(401).json({ error: 'Authentification requise.' });
      return;
    }
    const session = store.verify(match[1]);
    if (!session) {
      res.status(401).json({ error: 'Session invalide ou expirée.' });
      return;
    }
    if (session.role !== 'doctor') {
      res.status(403).json({ error: 'Accès interdit.' });
      return;
    }
    next();
  };
}
