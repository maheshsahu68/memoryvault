import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import Surprise from '../models/Surprise.js';
import AppError from '../utils/AppError.js';

const BCRYPT_ROUNDS = 12;
const normalizeSecretCode = (code) => code.trim().toLowerCase();

export function toPublicSurprise(surprise) {
  const source = surprise.toObject ? surprise.toObject() : surprise;
  const { creator, secretCode, isDeleted, __v, ...publicSurprise } = source;
  return { id: publicSurprise._id.toString(), ...publicSurprise, secretCode: { attemptsAllowed: secretCode?.attemptsAllowed ?? 5 } };
}

async function createUniqueSlug() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = randomBytes(9).toString('base64url');
    if (!(await Surprise.exists({ slug }))) return slug;
  }
  throw new AppError('Unable to generate a unique share link.', 500);
}

async function findOwnedSurprise(id, creatorId, includeHash = false) {
  const query = Surprise.findOne({ _id: id, creator: creatorId, isDeleted: false });
  if (includeHash) query.select('+secretCode.hash');
  const surprise = await query;
  if (!surprise) throw new AppError('Surprise not found.', 404, 'SURPRISE_NOT_FOUND');
  return surprise;
}

export async function createSurprise(creatorId, values) {
  const secretCodeHash = await bcrypt.hash(normalizeSecretCode(values.secretCode), BCRYPT_ROUNDS);
  const { secretCode, schedule, ...metadata } = values;
  return Surprise.create({
    ...metadata,
    creator: creatorId,
    slug: await createUniqueSlug(),
    secretCode: { hash: secretCodeHash },
    schedule: { status: 'draft', ...schedule },
  });
}

export async function listSurprises(creatorId, { page, limit, search, status, eventType }) {
  const filter = { creator: creatorId, isDeleted: false };
  if (status) filter['schedule.status'] = status;
  if (eventType) filter.eventType = eventType;
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ 'greeting.title': { $regex: escaped, $options: 'i' } }, { 'recipient.name': { $regex: escaped, $options: 'i' } }];
  }

  const [surprises, total] = await Promise.all([
    Surprise.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Surprise.countDocuments(filter),
  ]);
  return { surprises, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export const getSurprise = (id, creatorId) => findOwnedSurprise(id, creatorId);

export async function updateSurprise(id, creatorId, values) {
  const surprise = await findOwnedSurprise(id, creatorId, true);
  const { secretCode, ...updates } = values;
  if (updates.recipient) surprise.recipient = { ...surprise.recipient.toObject(), ...updates.recipient };
  if (updates.greeting) surprise.greeting = { ...surprise.greeting.toObject(), ...updates.greeting };
  if (updates.schedule) surprise.schedule = { ...surprise.schedule.toObject(), ...updates.schedule };
  if (updates.eventType) surprise.eventType = updates.eventType;
  if (secretCode) surprise.secretCode.hash = await bcrypt.hash(normalizeSecretCode(secretCode), BCRYPT_ROUNDS);
  await surprise.save();
  return surprise;
}

export async function deleteSurprise(id, creatorId) {
  const surprise = await findOwnedSurprise(id, creatorId);
  surprise.isDeleted = true;
  await surprise.save();
}

export async function duplicateSurprise(id, creatorId) {
  const original = await findOwnedSurprise(id, creatorId, true);
  const copy = original.toObject();
  delete copy._id; delete copy.createdAt; delete copy.updatedAt; delete copy.__v;
  copy.slug = await createUniqueSlug();
  copy.greeting.title = `${copy.greeting.title} (Copy)`;
  copy.schedule.status = 'draft';
  copy.isDeleted = false;
  return Surprise.create(copy);
}
