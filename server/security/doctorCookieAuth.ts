// Preparatory cookie-only doctor authentication. ISOLATED; never mounted in server/index.ts.
// Deployment requires audited HTTPS reverse proxy, credential provisioning, persistence,
// origin/CSRF rules for every sensitive route and a documented migration plan.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Router, type Request, type RequestHandler, type Response } from 'express';
import { verifyDoctorPassword } from './doctorCredentials.ts';
import { createSessionStore } from './sessionStore.ts';
import { originMatches } from './remoteAccessConfig.ts';
import { CLINICAL_PATHS } from './protectedClinicalRouter.ts';

const COOKIE_NAME = '__Host-medifollow_session';
type Store = ReturnType<typeof createSessionStore>;
type ClinicalPath = (typeof CLINICAL_PATHS)[number];
type Options = {
  username: string;
  passwordHash: string;
  sessions: Store;
  publicOrigin: string;
  handlers: Record<ClinicalPath, RequestHandler>;
  now?: () => number;
  maxFailures?: number;
  lockoutMs?: number;
};

function sessionTokenFromCookie(req: Request): string | null {
  const header = req.get('cookie') ?? '';
  if (header.length > 8192) return null;
  let token: string | null = null;
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key !== COOKIE_NAME) continue;
    if (token !== null || value.length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(value[0])) return null;
    token = value[0];
  }
  return token;
}

function csrfForToken(secret: Buffer, token: string): string {
  return createHmac('sha256', secret).update('medifollow-csrf-v1:').update(token).digest('hex');
}

function verifiedCsrf(secret: Buffer, token: string, provided: string | undefined): boolean {
  if (!provided || !/^[a-f0-9]{64}$/.test(provided)) return false;
  return timingSafeEqual(Buffer.from(csrfForToken(secret, token), 'hex'), Buffer.from(provided, 'hex'));
}

function cookieHeader(token: string, maxAgeSeconds: number): string {
  return COOKIE_NAME + '=' + token + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAgeSeconds;
}

function deny(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

export function createDoctorCookieAuth(options: Options): Router {
  const { username, passwordHash, sessions, publicOrigin, handlers } = options;
  if (!username || username.length > 128 || !passwordHash) throw new Error('Doctor credentials not configured');
  const parsed = new URL(publicOrigin);
  if (parsed.protocol !== 'https:' || parsed.origin !== publicOrigin || parsed.username || parsed.password ||
      parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('HTTPS public origin required for cookie authentication');
  }
  for (const path of CLINICAL_PATHS) {
    if (typeof handlers[path] !== 'function') throw new Error('Missing protected clinical handler: ' + path);
  }
  const now = options.now ?? Date.now;
  const maxFailures = options.maxFailures ?? 5;
  const lockoutMs = options.lockoutMs ?? 15 * 60_000;
  if (!Number.isSafeInteger(maxFailures) || maxFailures < 1 ||
      !Number.isSafeInteger(lockoutMs) || lockoutMs < 1) {
    throw new Error('Invalid lockout settings');
  }
  const csrfSecret = randomBytes(32);
  let failures = 0;
  let lockedUntil = 0;
  let loginBusy = false;
  const router = Router();

  const requireOrigin: RequestHandler = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!req.secure) { deny(res, 403, 'Connexion HTTPS requise.'); return; }
    if (!originMatches(req.get('origin'), publicOrigin)) {
      deny(res, 403, 'Origine non autorisée.');
      return;
    }
    next();
  };

  const requireCookieSession: RequestHandler = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!req.secure) { deny(res, 403, 'Connexion HTTPS requise.'); return; }
    const token = sessionTokenFromCookie(req);
    if (!token) { deny(res, 401, 'Authentification requise.'); return; }
    const session = sessions.verify(token);
    if (!session) { deny(res, 401, 'Session invalide ou expirée.'); return; }
    if (session.role !== 'doctor') { deny(res, 403, 'Accès interdit.'); return; }
    next();
  };

  const requireCsrf: RequestHandler = (req, res, next) => {
    const token = sessionTokenFromCookie(req);
    if (!token || !verifiedCsrf(csrfSecret, token, req.get('x-medifollow-csrf'))) {
      deny(res, 403, 'Protection CSRF invalide.');
      return;
    }
    next();
  };

  router.post('/api/auth/login', requireOrigin, async (req, res) => {
    if (!req.is('application/json')) { deny(res, 415, 'JSON requis.'); return; }
    if (now() < lockedUntil) { deny(res, 429, 'Trop de tentatives.'); return; }
    const suppliedUsername = typeof req.body?.username === 'string' ? req.body.username : '';
    const suppliedPassword = typeof req.body?.password === 'string' ? req.body.password : '';
    if (suppliedUsername.length > 128 || Buffer.byteLength(suppliedPassword, 'utf8') > 1024) {
      deny(res, 400, 'Identifiants invalides.');
      return;
    }
    if (loginBusy) { deny(res, 429, 'Connexion déjà en cours.'); return; }
    loginBusy = true;
    try {
      const valid = await verifyDoctorPassword(suppliedPassword, passwordHash);
      if (!valid || suppliedUsername !== username) {
        failures += 1;
        if (failures >= maxFailures) lockedUntil = now() + lockoutMs;
        deny(res, 401, 'Identifiants invalides.');
        return;
      }
      failures = 0;
      lockedUntil = 0;
      const issued = sessions.issue(username);
      const maxAge = Math.max(1, Math.floor((issued.expiresAt - now()) / 1000));
      res.setHeader('Set-Cookie', cookieHeader(issued.token, maxAge));
      // Do NOT return the raw bearer token in the JSON response.
      res.status(204).end();
    } catch {
      deny(res, 503, 'Authentification indisponible.');
    } finally {
      loginBusy = false;
    }
  });

  router.get('/api/auth/csrf', requireCookieSession, (req, res) => {
    // Same-origin fetches typically omit Origin on GET. Reject explicit foreign
    // origins and cross-site Fetch Metadata requests; CORS must stay disabled.
    const origin = req.get('origin');
    if ((origin && !originMatches(origin, publicOrigin)) ||
        (req.get('sec-fetch-site') && !['same-origin', 'none'].includes(req.get('sec-fetch-site')!))) {
      deny(res, 403, 'Origine non autorisée.');
      return;
    }
    const token = sessionTokenFromCookie(req)!;
    res.setHeader('Vary', 'Cookie');
    res.status(200).json({ csrfToken: csrfForToken(csrfSecret, token) });
  });

  router.post('/api/auth/logout', requireOrigin, requireCookieSession, requireCsrf, (req, res) => {
    const token = sessionTokenFromCookie(req)!;
    sessions.revoke(token);
    res.setHeader('Set-Cookie', cookieHeader('', 0));
    res.status(204).end();
  });

  for (const path of CLINICAL_PATHS) {
    router.post(path, requireOrigin, requireCookieSession, requireCsrf, handlers[path]);
  }
  return router;
}
