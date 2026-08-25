import { clearAuthCookies, setAuthCookies, setRefreshedAuthCookies } from '../utils/cookies.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateUser, createAuthTokens, createPasswordResetToken, refreshAccessToken, registerUser, resetPassword as resetUserPassword, toPublicUser } from '../services/authService.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { env } from '../config/env.js';

function sendAuthenticatedResponse(res, user, statusCode = 200) {
  const { accessToken, refreshToken } = createAuthTokens(user);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(statusCode).json({ success: true, data: { user: toPublicUser(user) } });
}

export const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);
  sendAuthenticatedResponse(res, user, 201);
});

export const login = asyncHandler(async (req, res) => {
  const user = await authenticateUser(req.body);
  sendAuthenticatedResponse(res, user);
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  res.status(200).json({ success: true, data: { message: 'Logged out successfully.' } });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { user: toPublicUser(req.user) } });
});

export const refresh = asyncHandler(async (req, res) => {
  const accessToken = await refreshAccessToken(req.cookies.refreshToken);
  setRefreshedAuthCookies(res, accessToken);
  res.status(200).json({ success: true, data: { message: 'Session refreshed.' } });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const reset = await createPasswordResetToken(req.body.email);
  if (reset) {
    const resetUrl = `${env.CLIENT_URL}/reset-password/${reset.token}`;
    await sendPasswordResetEmail({ email: reset.email, resetUrl });
  }
  res.status(200).json({ success: true, data: { message: 'If an account exists for that email, a password reset link has been sent.' } });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await resetUserPassword(req.params.token, req.body.password);
  res.status(200).json({ success: true, data: { message: 'Password reset successfully. You can now sign in.' } });
});
