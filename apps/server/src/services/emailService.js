import { env } from '../config/env.js';

export async function sendPasswordResetEmail({ email, resetUrl }) {
  if (env.NODE_ENV === 'development') {
    console.info(`Password reset link for ${email}: ${resetUrl}`);
    return;
  }

  // Email provider integration is intentionally deferred. Never expose this URL in an API response.
  console.info(`Password reset requested for ${email}. Configure an email provider before production use.`);
}
