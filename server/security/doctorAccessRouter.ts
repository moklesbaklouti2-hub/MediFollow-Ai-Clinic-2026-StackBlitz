// Isolated login + clinical route composition, NOT mounted on the live server.
// Bearer tokens are used only in this test harness. Production browser sessions
// require secure cookie/CSRF architecture and persistent deployment controls.
import { Router, type RequestHandler } from 'express';
import { createDoctorLogin } from './doctorLogin.ts';
import { createProtectedClinicalRouter, CLINICAL_PATHS } from './protectedClinicalRouter.ts';
import { createSessionStore } from './sessionStore.ts';

type Store = ReturnType<typeof createSessionStore>;
export function createDoctorAccessRouter(options: {
  username: string;
  passwordHash: string;
  sessions: Store;
  handlers: Record<(typeof CLINICAL_PATHS)[number], RequestHandler>;
}): Router {
  const router = Router();
  const auth = createDoctorLogin(options);
  router.post('/api/auth/login', auth.login);
  router.post('/api/auth/logout', auth.logout);
  router.use(createProtectedClinicalRouter(options.sessions, options.handlers));
  return router;
}
