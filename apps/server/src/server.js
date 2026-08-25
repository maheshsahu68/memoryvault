import app from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

async function startServer() {
  await connectDatabase();
  app.listen(env.PORT, () => {
    console.info(`MemoryVault API listening on port ${env.PORT}.`);
  });
}

startServer().catch((error) => {
  console.error('Unable to start MemoryVault API.', error.message);
  process.exit(1);
});
