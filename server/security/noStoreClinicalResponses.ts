// Defence-in-depth for clinical API responses. This is NOT authentication.
// Apply before every clinical handler (including errors and remote-mode denials)
// so intermediary caches do not retain clinical request results.
import type { RequestHandler } from 'express';

export const preventClinicalCaching: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
};
