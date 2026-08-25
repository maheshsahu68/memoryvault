import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import AppError from '../utils/AppError.js';

export default function verifyCsrf(req, res, next) {
  const cookieToken = req.cookies[env.CSRF_COOKIE_NAME];
  const headerToken = req.get('X-CSRF-Token');

  if (!cookieToken || !headerToken) {
    return next(new AppError('CSRF token validation failed.', 403, 'CSRF_VALIDATION_FAILED'));
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  if (cookieBuffer.length !== headerBuffer.length || !timingSafeEqual(cookieBuffer, headerBuffer)) {
    return next(new AppError('CSRF token validation failed.', 403, 'CSRF_VALIDATION_FAILED'));
  }

  return next();
}
