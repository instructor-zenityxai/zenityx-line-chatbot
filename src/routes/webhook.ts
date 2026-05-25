import { Router, type Request, type Response } from 'express';
import type { WebhookRequestBody, WebhookEvent } from '@line/bot-sdk';
import { verifyLineSignature } from '../integrations/line/verify.js';
import { handleMessage } from '../lib/handlers/message.js';
import { handlePostback } from '../lib/handlers/postback.js';
import { handleFollow, handleUnfollow } from '../lib/handlers/follow.js';
import { logEvent } from '../services/message-store.js';
import { logger } from '../lib/logger.js';

export const webhookRouter: Router = Router();

// LINE webhook ต้องอ่าน raw body ก่อน verify signature
webhookRouter.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const signature = req.header('x-line-signature');
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    logger.error('rawBody missing — make sure express.json verify is set');
    res.status(500).end();
    return;
  }

  if (!verifyLineSignature(rawBody, signature)) {
    logger.warn({ signature }, 'invalid signature');
    res.status(401).end();
    return;
  }

  // Reply 200 ทันทีกัน LINE retry — แล้วประมวลผล async
  res.status(200).end();

  const body = req.body as WebhookRequestBody;
  const events = body.events ?? [];

  await Promise.allSettled(
    events.map(async (event) => {
      try {
        await dispatchEvent(event);
      } catch (err) {
        const userId = 'source' in event ? event.source.userId ?? null : null;
        logger.error({ err, eventType: event.type }, 'event dispatch failed');
        await logEvent(event.type, event, userId, (err as Error).message);
      }
    }),
  );
});

async function dispatchEvent(event: WebhookEvent): Promise<void> {
  switch (event.type) {
    case 'message':
      await handleMessage(event);
      return;
    case 'postback':
      await handlePostback(event);
      return;
    case 'follow':
      await handleFollow(event);
      return;
    case 'unfollow':
      await handleUnfollow(event);
      return;
    case 'join':
    case 'leave': {
      const groupId = 'source' in event && event.source.type !== 'user'
        ? (event.source as { groupId?: string; roomId?: string }).groupId ??
          (event.source as { groupId?: string; roomId?: string }).roomId
        : null;
      logger.info({ type: event.type, groupId }, 'group event — copy this ID to LINE_ADMIN_GROUP_ID');
      await logEvent(event.type, event, null);
      return;
    }
    default:
      logger.debug({ type: event.type }, 'unhandled event type — logged only');
      await logEvent(event.type, event, null);
      return;
  }
}
