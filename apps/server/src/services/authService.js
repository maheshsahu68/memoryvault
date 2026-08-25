import bcrypt from 'bcrypt';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { signAccessToken, signRefreshToken } from '../utils/token.js';

const BCRYPT_ROUNDS = 12;

export function toPublicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

export async function registerUser({ name, email, password }) {
  const existingUser = await User.exists({ email });
  if (existingUser) throw new AppError('An account already exists for this email.', 409, 'EMAIL_ALREADY_IN_USE');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    return await User.create({ name, email, passwordHash });
  } catch (error) {
    if (error?.code === 11000) throw new AppError('An account already exists for this email.', 409, 'EMAIL_ALREADY_IN_USE');
    throw error;
  }
}

export async function authenticateUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
  }
  return user;
}

export function createAuthTokens(user) {
  return { accessToken: signAccessToken(user), refreshToken: signRefreshToken(user) };
}
