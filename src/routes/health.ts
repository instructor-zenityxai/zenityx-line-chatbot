import { Router, type Request, type Response } from 'express';
import { env } from '../config/env.js';

export const healthRouter: Router = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'zenityx-line-chatbot',
    env: env.NODE_ENV,
    time: new Date().toISOString(),
  });
});

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'ZenityX LINE Chatbot — see /health',
  });
});
