import type { WebhookEvent } from '@line/bot-sdk';
import { lineClient } from '../../integrations/line/client.js';
import { upsertUser, setBlocked } from '../../services/user-service.js';
import { saveMessage, logEvent } from '../../services/message-store.js';
import { welcomeFlex } from '../../flex/welcome.js';
import { reply } from '../../integrations/line/replies.js';
import { logger } from '../logger.js';

export async function handleFollow(event: WebhookEvent): Promise<void> {
  if (event.type !== 'follow') return;
  const lineUserId = event.source.userId;
  if (!lineUserId) return;

  let displayName: string | null = null;
  let pictureUrl: string | null = null;
  try {
    const profile = await lineClient.getProfile(lineUserId);
    displayName = profile.displayName;
    pictureUrl = profile.pictureUrl ?? null;
  } catch (err) {
    logger.warn({ err, lineUserId }, 'getProfile failed during follow');
  }

  await upsertUser({ lineUserId, displayName, pictureUrl });
  await logEvent('follow', event, lineUserId);

  const welcome = welcomeFlex(displayName);
  await reply(event.replyToken, welcome);
  await saveMessage({
    lineUserId,
    direction: 'outbound',
    source: 'system',
    messageType: 'flex',
    content: welcome as unknown as Record<string, unknown>,
  });
}

export async function handleUnfollow(event: WebhookEvent): Promise<void> {
  if (event.type !== 'unfollow') return;
  const lineUserId = event.source.userId;
  if (!lineUserId) return;
  await setBlocked(lineUserId, true);
  await logEvent('unfollow', event, lineUserId);
  logger.info({ lineUserId }, 'user unfollowed');
}
