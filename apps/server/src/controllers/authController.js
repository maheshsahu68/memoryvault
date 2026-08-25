import { clearAuthCookies, setAuthCookies } from '../utils/cookies.js';
import asyncHandler from '../utils/asyncHandler.js';
import { authenticateUser, createAuthTokens, registerUser, toPublicUser } from '../services/authService.js';

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
