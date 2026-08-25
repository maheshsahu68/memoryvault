import mongoose from 'mongoose';
import { env } from './env.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2_000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connectDatabase(attempt = 1) {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.info('Connected to MongoDB.');
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(`MongoDB connection failed after ${MAX_RETRIES} attempts: ${error.message}`);
    }

    console.warn(`MongoDB connection attempt ${attempt} failed; retrying in ${RETRY_DELAY_MS}ms.`);
    await delay(RETRY_DELAY_MS);
    return connectDatabase(attempt + 1);
  }
}
