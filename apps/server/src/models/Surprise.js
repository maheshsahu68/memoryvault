import mongoose from 'mongoose';

const surpriseSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  slug: { type: String, required: true, unique: true, index: true },
  eventType: { type: String, required: true, enum: ['birthday', 'anniversary', 'wedding', 'graduation', 'holiday', 'other'] },
  recipient: {
    name: { type: String, required: true, trim: true },
    nickname: { type: String, trim: true },
    avatarUrl: { type: String },
  },
  greeting: {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    letter: { type: String },
  },
  theme: { key: { type: String, default: 'classic' }, customBackgroundUrl: String },
  music: { mode: { type: String, default: 'none' }, url: String, builtInTrackId: String },
  secretCode: { hash: { type: String, required: true, select: false }, attemptsAllowed: { type: Number, default: 5 } },
  animations: {
    confetti: { type: Boolean, default: false }, fireworks: { type: Boolean, default: false }, floatingHearts: { type: Boolean, default: false },
    sparkles: { type: Boolean, default: false }, balloons: { type: Boolean, default: false }, typing: { type: Boolean, default: false },
    snow: { type: Boolean, default: false }, rain: { type: Boolean, default: false }, stars: { type: Boolean, default: false },
  },
  schedule: { status: { type: String, enum: ['draft', 'scheduled', 'published', 'expired'], default: 'draft' }, publishAt: Date, expireAt: Date, timezone: String },
  stats: { views: { type: Number, default: 0 }, unlockAttempts: { type: Number, default: 0 }, lastViewedAt: Date },
  isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

surpriseSchema.index({ creator: 1, isDeleted: 1, createdAt: -1 });

export default mongoose.model('Surprise', surpriseSchema);
