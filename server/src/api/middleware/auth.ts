import { Request, Response, NextFunction } from 'express';
import { createApiError } from './error-handler.js';
import { logger } from '../../utils/logger.js';
import { getConfig } from '../../config.js';

export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const { apiKey } = getConfig().server;

  if (!apiKey) {
    // No key configured — auth disabled
    return next();
  }

  const header = req.headers['x-api-key'] as string | undefined;
  const bearer = req.headers.authorization;

  const provided = header || (bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined);

  if (!provided) {
    logger.warn('Missing API key', { path: req.path });
    return next(createApiError(401, 'Missing API key. Provide via X-API-Key header or Authorization: Bearer <key>'));
  }

  if (provided !== apiKey) {
    logger.warn('Invalid API key', { path: req.path });
    return next(createApiError(403, 'Invalid API key'));
  }

  next();
}
