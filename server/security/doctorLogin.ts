// Preparatory doctor login controller. NOT mounted in production.
// Must be deployed only behind HTTPS, with secure credential provisioning,
// CSRF/origin considerations, and a persistent distributed rate limiter if scaled.
import type { RequestHandler } from 'express';
import { verifyDoctorPassword } from './doctorCredentials.ts';
import { createSessionStore } from './sessionStore.ts';

type Store = ReturnType<typeof createSessionStore>;
type LoginOptions = {
  username: string;
  passwordHash: string;
  sessions: Store;
  now?: () => number;
  maxFailures?: number;
  lockoutMs?: number;
};
export function createDoctorLogin(options: LoginOptions): {
  login: RequestHandler;
  logout: RequestHandler;
} {
  const { username, passwordHash, sessions } = options;
  if (!username || !passwordHash) throw new Error('Missing server-side doctor credentials');
  const now = options.now ?? Date.now;
  const maxFailures = options.maxFailures ?? 5;
  const lockoutMs = options.lockoutMs ?? 15 * 60_000;
  if (!Number.isSafeInteger(maxFailures) || maxFailures < 1 || !Number.isSafeInteger(lockoutMs) || lockoutMs < 1) {
    throw new Error('Invalid lockout configuration');
  }
  // Single-doctor local process only. A shared store and IP controls are required for deployment.
  let failures = 0;
  let lockedUntil = 0;
  const login: RequestHandler = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (now() < lockedUntil) {
      res.status(429).json({ error: 'Trop de tentatives. Réessayez plus tard.' });
      return;
    }
    const body = req.body;
    const suppliedUsername = body && typeof body.username === 'string' ? body.username : '';
    const suppliedPassword = body && typeof body.password === 'string' ? body.password : '';
    if (suppliedUsername.length > 128 || suppliedPassword.length > 1024) {
      res.status(400).json({ error: 'Identifiants invalides.' });
      return;
    }
    try {
      // Always verify against the configured hash to avoid username enumeration.
      const passwordValid = await verifyDoctorPassword(suppliedPassword, passwordHash);
      if (suppliedUsername !== username || !passwordValid) {
        failures += 1;
        if (failures >= maxFailures) lockedUntil = now() + lockoutMs;
        res.status(401).json({ error: 'Identifiants invalides.' });
        return;
      }
      failures = 0;
      lockedUntil = 0;
      const session = sessions.issue(username);
      res.status(200).json(session);
    } catch {
      res.status(503).json({ error: 'Authentification temporairement indisponible.' });
    }
  };
  const logout: RequestHandler = (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.get('authorization') ?? '');
    if (!match || !sessions.revoke(match[1])) {
      res.status(401).json({ error: 'Session invalide.' });
      return;
    }
    res.status(204).end();
  };
  return { login, logout };
}
