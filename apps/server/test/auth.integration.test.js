import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

let mongoServer;
let app;
let User;
const sentResetLinks = vi.hoisted(() => []);

vi.mock('../src/services/emailService.js', () => ({
  sendPasswordResetEmail: async ({ resetUrl }) => { sentResetLinks.push(resetUrl); },
}));

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

describe('Phase 1B–1C authentication', () => {
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
      expect(body.data.user.createdAt).toBeTruthy();
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

    const refreshedCsrfCookie = login.headers['set-cookie'].find((cookie) => cookie.startsWith('csrfToken='));
    const refreshedCsrfToken = refreshedCsrfCookie.split(';')[0].split('=').slice(1).join('=');
    const refresh = await agent.post('/api/auth/refresh').set('X-CSRF-Token', refreshedCsrfToken).expect(200);
    expect(refresh.headers['set-cookie']).toHaveLength(2);
    await agent.get('/api/auth/me').expect(200);

    await request(app).post('/api/auth/forgot-password').send({ email: credentials.email }).expect(200);
    expect(sentResetLinks).toHaveLength(1);
    const resetToken = new URL(sentResetLinks[0]).pathname.split('/').at(-1);
    const resetUser = await User.findOne({ email: credentials.email }).select('+passwordResetToken +passwordResetExpires');
    expect(resetUser.passwordResetToken).not.toBe(resetToken);
    expect(resetUser.passwordResetExpires).toBeInstanceOf(Date);

    await request(app).post('/api/auth/reset-password/not-a-real-token').send({ password: 'AnotherPassword123!', passwordConfirm: 'AnotherPassword123!' }).expect(400);
    resetUser.passwordResetExpires = new Date(Date.now() - 1_000);
    await resetUser.save({ validateBeforeSave: false });
    await request(app).post(`/api/auth/reset-password/${resetToken}`).send({ password: 'AnotherPassword123!', passwordConfirm: 'AnotherPassword123!' }).expect(400);

    await request(app).post('/api/auth/forgot-password').send({ email: credentials.email }).expect(200);
    const validResetToken = new URL(sentResetLinks.at(-1)).pathname.split('/').at(-1);
    await request(app).post(`/api/auth/reset-password/${validResetToken}`).send({ password: 'AnotherPassword123!', passwordConfirm: 'AnotherPassword123!' }).expect(200);
    await request(app).post('/api/auth/login').send({ email: credentials.email, password: credentials.password }).expect(401);
    await request(app).post('/api/auth/login').send({ email: credentials.email, password: 'AnotherPassword123!' }).expect(200);
  });
});

describe('Phase 2 surprises CRUD', () => {
  it('creates, lists, searches, filters, updates, duplicates, and deletes only the creator’s surprises', async () => {
    const agent = request.agent(app);
    const credentials = { name: 'Surprise Creator', email: 'surprise@example.com', password: 'SafePassword123!' };
    const registration = await agent.post('/api/auth/register').send(credentials).expect(201);
    const csrfCookie = registration.headers['set-cookie'].find((cookie) => cookie.startsWith('csrfToken='));
    const csrfToken = csrfCookie.split(';')[0].split('=').slice(1).join('=');
    const payload = {
      eventType: 'birthday',
      recipient: { name: 'Alex', nickname: 'Al' },
      greeting: { title: 'Happy Birthday Alex', subtitle: 'A special day', letter: 'Have a wonderful birthday.' },
      secretCode: 'AlexCode123',
      schedule: { status: 'draft' },
    };

    const created = await agent.post('/api/surprises').set('X-CSRF-Token', csrfToken).send(payload).expect(201);
    const surprise = created.body.data.surprise;
    expect(surprise).toMatchObject({ eventType: 'birthday', recipient: { name: 'Alex' }, greeting: { title: 'Happy Birthday Alex' } });
    expect(surprise.secretCode).not.toHaveProperty('hash');

    const saved = await (await import('../src/models/Surprise.js')).default.findById(surprise.id).select('+secretCode.hash');
    expect(saved.secretCode.hash).not.toBe(payload.secretCode);

    await agent.get(`/api/surprises/${surprise.id}`).expect(200);
    const updated = await agent.patch(`/api/surprises/${surprise.id}`).set('X-CSRF-Token', csrfToken).send({ greeting: { title: 'Updated Birthday' }, schedule: { status: 'published' } }).expect(200);
    expect(updated.body.data.surprise.greeting.title).toBe('Updated Birthday');
    expect(updated.body.data.surprise.schedule.status).toBe('published');

    const duplicate = await agent.post(`/api/surprises/${surprise.id}/duplicate`).set('X-CSRF-Token', csrfToken).expect(201);
    expect(duplicate.body.data.surprise.greeting.title).toBe('Updated Birthday (Copy)');
    expect(duplicate.body.data.surprise.schedule.status).toBe('draft');

    await agent.post('/api/surprises').set('X-CSRF-Token', csrfToken).send({ ...payload, eventType: 'anniversary', recipient: { name: 'Jamie' }, greeting: { title: 'Anniversary Celebration' }, secretCode: 'JamieCode123' }).expect(201);
    const searched = await agent.get('/api/surprises?search=updated&limit=1').expect(200);
    expect(searched.body.data.surprises).toHaveLength(1);
    expect(searched.body.meta.total).toBe(2);
    const filtered = await agent.get('/api/surprises?status=published&eventType=birthday').expect(200);
    expect(filtered.body.data.surprises).toHaveLength(1);
    expect(filtered.body.data.surprises[0].id).toBe(surprise.id);

    const anotherAgent = request.agent(app);
    const otherRegistration = await anotherAgent.post('/api/auth/register').send({ name: 'Other Creator', email: 'other@example.com', password: 'SafePassword123!' }).expect(201);
    const otherCsrf = otherRegistration.headers['set-cookie'].find((cookie) => cookie.startsWith('csrfToken=')).split(';')[0].split('=').slice(1).join('=');
    await anotherAgent.get(`/api/surprises/${surprise.id}`).expect(404);
    await anotherAgent.delete(`/api/surprises/${surprise.id}`).set('X-CSRF-Token', otherCsrf).expect(404);

    await agent.delete(`/api/surprises/${surprise.id}`).set('X-CSRF-Token', csrfToken).expect(200);
    await agent.get(`/api/surprises/${surprise.id}`).expect(404);
  });
});
