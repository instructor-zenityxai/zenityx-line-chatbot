import express, { type Express, type Request } from 'express';
import { webhookRouter } from './routes/webhook.js';
import { healthRouter } from './routes/health.js';
import { logger } from './lib/logger.js';

export function createApp(): Express {
  const app = express();

  // express.json ที่เก็บ raw body ไว้ ให้ webhook verify signature
  app.use(
    express.json({
      verify: (req: Request, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path }, 'request');
    next();
  });

  app.use(healthRouter);
  app.use(webhookRouter);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'unhandled error');
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}
