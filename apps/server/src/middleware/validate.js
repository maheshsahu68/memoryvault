import AppError from '../utils/AppError.js';

export default function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError('Request validation failed.', 400, 'VALIDATION_ERROR', result.error.flatten()));
    }
    req.body = result.data;
    return next();
  };
}
