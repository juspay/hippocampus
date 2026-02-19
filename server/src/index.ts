import dotenv from 'dotenv';
dotenv.config();

import { loadConfig } from './config.js';
const config = loadConfig();

import { initLogger, logger } from './utils/logger.js';
initLogger(config.server.logLevel);

import express from 'express';
import cors from 'cors';
import { createDataStore } from './db/index.js';
import { ProviderFactory } from './providers/index.js';
import { MemoryService } from './services/memory.service.js';
import { TemporalService } from './services/temporal.service.js';
import { DecayService } from './services/decay.service.js';
import { EngramController } from './api/controllers/engram.controller.js';
import { ChronicleController } from './api/controllers/chronicle.controller.js';
import { SystemController } from './api/controllers/system.controller.js';
import { mountRoutes } from './api/routes/index.js';
import { errorHandler, notFound } from './api/middleware/error-handler.js';
import { authGuard } from './api/middleware/auth.js';

async function bootstrap(): Promise<void> {
  const { port, host } = config.server;

  // 1. Create providers
  logger.info('Creating AI providers...');
  const { embedder, completion } = ProviderFactory.createFromConfig();

  // 2. Initialize database
  logger.info('Initializing database...');
  const store = await createDataStore(undefined, embedder.dimensions);

  // 3. Wire services
  const memoryService = new MemoryService(store, embedder, completion);
  const temporalService = new TemporalService(store);
  const decayService = new DecayService(store);

  // 4. Create controllers
  const engramController = new EngramController(memoryService);
  const chronicleController = new ChronicleController(temporalService);
  const systemController = new SystemController(memoryService, decayService);

  // 5. Build Express app
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // API key auth
  app.use('/api', authGuard);

  // Mount API routes
  app.use('/api', mountRoutes({
    engram: engramController,
    chronicle: chronicleController,
    system: systemController,
  }));

  // Error handling
  app.use(notFound);
  app.use(errorHandler);

  // 6. Start server
  app.listen(port, host, () => {
    logger.info(`Hippocampus server running on ${host}:${port}`);
  });
}

bootstrap().catch(err => {
  logger.error('Failed to start server', { error: String(err) });
  process.exit(1);
});
