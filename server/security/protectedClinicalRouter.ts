// Reusable clinical authorization boundary. Prepared for integration; NOT mounted in server/index.ts.
// Actual route handlers must be attached behind this boundary only after login UI and HTTPS are ready.
import { Router, type RequestHandler } from 'express';
import { createDoctorSessionGuard } from './doctorSessionGuard.ts';
import { createSessionStore } from './sessionStore.ts';

export const CLINICAL_PATHS = [
  '/api/clinical/analyze',
  '/api/commands/interpret',
  '/api/chat',
] as const;

type Store = ReturnType<typeof createSessionStore>;
export function createProtectedClinicalRouter(
  sessions: Store,
  handlers: Record<(typeof CLINICAL_PATHS)[number], RequestHandler>,
): Router {
  const router = Router();
  const requireDoctor = createDoctorSessionGuard(sessions);
  for (const path of CLINICAL_PATHS) {
    if (typeof handlers[path] !== 'function') {
      throw new Error('Missing protected clinical handler: ' + path);
    }
    router.post(path, requireDoctor, handlers[path]);
  }
  return router;
}
