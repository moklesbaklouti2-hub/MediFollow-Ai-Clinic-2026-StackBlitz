// Only handle known body-parser JSON failures, never print/echo incoming
// clinical request data, request bodies, upstream details or stack traces.
// This does not authenticate callers or validate clinical content.
import type { ErrorRequestHandler } from 'express';

export function classifyJsonBodyError(error: unknown): 400 | 413 | null {
  if (!error || typeof error !== 'object') return null;
  const type = (error as { type?: unknown }).type;
  if (type === 'entity.parse.failed') return 400;
  if (type === 'entity.too.large') return 413;
  return null;
}

export const handleJsonBodyError: ErrorRequestHandler = (error, _req, res, next) => {
  const status = classifyJsonBodyError(error);
  if (status === null || res.headersSent) {
    next(error);
    return;
  }
  res.status(status).json({
    error: status === 413 ? 'Corps JSON trop volumineux.' : 'Corps JSON invalide.',
  });
};
