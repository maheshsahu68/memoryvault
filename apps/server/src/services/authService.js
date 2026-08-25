import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.js';

const BCRYPT_ROUNDS = 12;
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

const hashResetToken = (token) => createHash('sha256').update(token).digest('hex');

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

export async function refreshAccessToken(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid refresh token.', 401, 'INVALID_TOKEN');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new AppError('Invalid refresh token.', 401, 'INVALID_TOKEN');
  return signAccessToken(user);
}

export async function createPasswordResetToken(email) {
  const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');
  if (!user) return null;

  const token = randomBytes(32).toString('hex');
  user.passwordResetToken = hashResetToken(token);
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save({ validateBeforeSave: false });
  return { email: user.email, token };
}

export async function resetPassword(token, password) {
  const passwordResetToken = hashResetToken(token);
  const user = await User.findOne({
    passwordResetToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordHash +passwordResetToken +passwordResetExpires');

  if (!user) throw new AppError('This password reset link is invalid or has expired.', 400, 'INVALID_OR_EXPIRED_RESET_TOKEN');

  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
}
