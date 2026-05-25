import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      model: env.ANTHROPIC_MODEL,
    },
    `ZenityX LINE Chatbot listening on :${env.PORT}`,
  );
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'shutting down...');
  server.close(() => {
    logger.info('server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandledRejection');
});
