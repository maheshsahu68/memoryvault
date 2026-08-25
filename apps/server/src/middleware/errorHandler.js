import { ZodError } from 'zod';
import AppError from '../utils/AppError.js';

export function notFoundHandler(req, res, next) {
  next(new AppError(`Route ${req.method} ${req.originalUrl} was not found.`, 404, 'NOT_FOUND'));
}

export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  let normalizedError = error;

  if (error instanceof ZodError) {
    normalizedError = new AppError('Request validation failed.', 400, 'VALIDATION_ERROR', error.flatten());
  }

  const statusCode = normalizedError.statusCode || 500;
  const response = {
    success: false,
    error: {
      code: normalizedError.code || 'INTERNAL_SERVER_ERROR',
      message: normalizedError.isOperational ? normalizedError.message : 'An unexpected error occurred.',
    },
  };

  if (normalizedError.details) response.error.details = normalizedError.details;
  if (process.env.NODE_ENV !== 'production' && !normalizedError.isOperational) response.error.stack = normalizedError.stack;

  if (statusCode >= 500) console.error(normalizedError);
  res.status(statusCode).json(response);
}
