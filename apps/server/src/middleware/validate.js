import AppError from '../utils/AppError.js';

export default function validate(schema, location = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[location]);
    if (!result.success) {
      return next(new AppError('Request validation failed.', 400, 'VALIDATION_ERROR', result.error.flatten()));
    }
    req[location] = result.data;
    return next();
  };
}
