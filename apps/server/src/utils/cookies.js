import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

function durationToMs(value) {
  const match = /^(\d+)\s*([smhd])$/i.exec(value);
  if (!match) return undefined;
  const units = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * units[match[2].toLowerCase()];
}

function baseCookieOptions(httpOnly) {
  const isProduction = env.NODE_ENV === 'production';
  const options = {
    httpOnly,
    secure: isProduction,
    sameSite: (isProduction ? 'None' : env.COOKIE_SAMESITE).toLowerCase(),
    path: '/',
  };
  if (env.COOKIE_DOMAIN) options.domain = env.COOKIE_DOMAIN;
  return options;
}

export function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('accessToken', accessToken, { ...baseCookieOptions(true), maxAge: durationToMs(env.JWT_ACCESS_EXPIRES) });
  res.cookie('refreshToken', refreshToken, { ...baseCookieOptions(true), maxAge: durationToMs(env.JWT_REFRESH_EXPIRES) });
  res.cookie(env.CSRF_COOKIE_NAME, randomBytes(32).toString('hex'), baseCookieOptions(false));
}

export function clearAuthCookies(res) {
  res.clearCookie('accessToken', baseCookieOptions(true));
  res.clearCookie('refreshToken', baseCookieOptions(true));
  res.clearCookie(env.CSRF_COOKIE_NAME, baseCookieOptions(false));
}
