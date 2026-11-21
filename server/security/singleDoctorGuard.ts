// Preparatory single-doctor API guard. NOT enabled in server/index.ts.
// A static bearer secret is a temporary integration mechanism, not a user session.
// Never put this secret in the browser, client bundle, GitHub, or logs.
import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

const digest = (value: string) => createHash('sha256').update(value).digest();

export function createSingleDoctorGuard(secret: string): RequestHandler {
  if (typeof secret !== 'string' || secret.length < 32 || /\s/.test(secret)) {
    throw new Error('Server-side access secret must be at least 32 non-whitespace characters.');
  }
  const expected = digest(secret);
  return (req, res, next) => {
    const authorization = req.get('authorization') ?? '';
    const match = /^Bearer ([^\s]+)$/.exec(authorization);
    if (!match) {
      res.status(401).json({ error: 'Authentification requise.' });
      return;
    }
    const actual = digest(match[1]);
    if (!timingSafeEqual(actual, expected)) {
      res.status(403).json({ error: 'Accès interdit.' });
      return;
    }
    next();
  };
}
