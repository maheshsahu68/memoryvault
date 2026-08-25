import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/token.js';

export default async function authenticate(req, res, next) {
  try {
    const token = req.cookies.accessToken;
    if (!token) return next(new AppError('Authentication is required.', 401, 'UNAUTHORIZED'));

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return next(new AppError('Authentication is required.', 401, 'UNAUTHORIZED'));

    req.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) return next(new AppError('Access token has expired.', 401, 'TOKEN_EXPIRED'));
    if (error instanceof jwt.JsonWebTokenError) return next(new AppError('Invalid access token.', 401, 'INVALID_TOKEN'));
    return next(error);
  }
}
