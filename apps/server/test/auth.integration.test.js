import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

let mongoServer;
let app;
let User;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '5000',
    MONGODB_URI: mongoServer.getUri(),
    JWT_ACCESS_SECRET: 'access-secret-that-is-longer-than-thirty-two-characters',
    JWT_REFRESH_SECRET: 'refresh-secret-that-is-longer-than-thirty-two-characters',
    JWT_ACCESS_EXPIRES: '15m',
    JWT_REFRESH_EXPIRES: '30d',
    VIEW_TOKEN_SECRET: 'view-secret-that-is-longer-than-thirty-two-characters',
    CSRF_COOKIE_NAME: 'csrfToken',
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
    CLIENT_URL: 'http://localhost:5173',
    COOKIE_SAMESITE: 'Lax',
    EMAIL_PROVIDER_API_KEY: 'test-email-key',
    EMAIL_FROM: 'test@example.com',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX: '1000',
  });

  await mongoose.connect(process.env.MONGODB_URI);
  ({ default: app } = await import('../src/app.js'));
  ({ default: User } = await import('../src/models/User.js'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 1B authentication', () => {
  it('registers, logs in, protects /me, and logs out with CSRF validation', async () => {
    const agent = request.agent(app);
    const credentials = { name: 'Test Creator', email: 'creator@example.com', password: 'SafePassword123!' };

    const registration = await agent.post('/api/auth/register').send(credentials).expect(201);
    expect(registration.body.data.user).toMatchObject({ name: credentials.name, email: credentials.email, role: 'creator' });
    expect(registration.headers['set-cookie']).toHaveLength(3);

    const savedUser = await User.findOne({ email: credentials.email }).select('+passwordHash');
    expect(savedUser.passwordHash).not.toBe(credentials.password);
    expect(savedUser.toObject()).not.toHaveProperty('password');

    await agent.get('/api/auth/me').expect(200).expect(({ body }) => {
      expect(body.data.user.email).toBe(credentials.email);
    });

    await agent.post('/api/auth/logout').expect(403).expect(({ body }) => {
      expect(body.error.code).toBe('CSRF_VALIDATION_FAILED');
    });

    const csrfCookie = registration.headers['set-cookie'].find((cookie) => cookie.startsWith('csrfToken='));
    const csrfToken = csrfCookie.split(';')[0].split('=').slice(1).join('=');
    await agent.post('/api/auth/logout').set('X-CSRF-Token', csrfToken).expect(200);
    await agent.get('/api/auth/me').expect(401);

    const login = await agent.post('/api/auth/login').send({ email: credentials.email, password: credentials.password }).expect(200);
    expect(login.headers['set-cookie']).toHaveLength(3);
    await agent.get('/api/auth/me').expect(200);
  });
});
