import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const tokenPayload = (user) => ({ sub: user._id.toString(), role: user.role });

export const signAccessToken = (user) => jwt.sign(tokenPayload(user), env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES });
export const signRefreshToken = (user) => jwt.sign(tokenPayload(user), env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES });
export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);
