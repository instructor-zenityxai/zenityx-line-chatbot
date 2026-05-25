import type { WebhookEvent } from '@line/bot-sdk';
import { upsertUser } from '../../services/user-service.js';
import { routeMessage } from '../../services/conversation-router.js';
import { saveMessage, logEvent } from '../../services/message-store.js';
import { filterGroupMessage } from '../../services/group-filter.js';
import { reply } from '../../integrations/line/replies.js';
import { textMessage } from '../../integrations/line/replies.js';
import { logger } from '../logger.js';

export async function handleMessage(event: WebhookEvent): Promise<void> {
  if (event.type !== 'message') return;
  const lineUserId = event.source.userId;
  if (!lineUserId) return;

  await logEvent('message', event, lineUserId);

  // ===== Group/Room filter =====
  // ใน private chat (source.type === 'user') → ตอบทุกอย่าง
  // ใน group/room → ตอบเฉพาะ @mention bot หรือ prefix /zen, /bot
  const isPrivate = event.source.type === 'user';
  let userText: string;

  if (event.message.type !== 'text') {
    // Non-text: ใน group ก็เงียบ; ใน private chat ตอบสั้น ๆ
    if (!isPrivate) return;
    await reply(
      event.replyToken,
      textMessage(
        'ขณะนี้ผมรับเฉพาะข้อความแบบพิมพ์ครับ ลองพิมพ์คำถามมาได้เลย หรือพิมพ์ "เมนู" ดูตัวเลือกครับ',
      ),
    );
    return;
  }

  if (isPrivate) {
    userText = event.message.text;
  } else {
    // Group / Room — apply filter
    const result = filterGroupMessage(event.message);
    if (!result.shouldReply) {
      logger.debug(
        { sourceType: event.source.type, text: event.message.text.slice(0, 40) },
        'group message ignored (no mention/prefix)',
      );
      return;
    }
    userText = result.cleanText;
    logger.info(
      { reason: result.reason, sourceType: event.source.type },
      'group message accepted',
    );
  }

  // Ensure user exists (private chat เท่านั้น — group เราไม่ track per-user state)
  if (isPrivate) {
    await upsertUser({ lineUserId });
    await saveMessage({
      lineUserId,
      direction: 'inbound',
      source: 'user',
      messageType: 'text',
      content: { text: userText },
      lineMessageId: event.message.id,
    });
  }

  try {
    const result = isPrivate
      ? await routeMessage(lineUserId, userText)
      : await routeGroupMessage(userText);

    if (result.silentMode) {
      logger.debug({ lineUserId }, 'silent mode (human) — no reply sent');
      return;
    }
    if (result.messages.length === 0) return;
    await reply(event.replyToken, result.messages);

    if (isPrivate) {
      for (const msg of result.messages) {
        const messageType =
          msg.type === 'text' ? 'text' : msg.type === 'flex' ? 'flex' : null;
        if (!messageType) continue;
        await saveMessage({
          lineUserId,
          direction: 'outbound',
          source: 'bot',
          messageType,
          content: msg as unknown as Record<string, unknown>,
        });
      }
    }
  } catch (err) {
    logger.error({ err, lineUserId, userText: userText.slice(0, 50) }, 'handleMessage failed');
    try {
      await reply(
        event.replyToken,
        textMessage('ขออภัยครับ ระบบขัดข้องชั่วคราว ลองพิมพ์ "เมนู" อีกครั้ง'),
      );
    } catch {
      // reply token อาจหมดอายุ — ปล่อย
    }
  }
}

/**
 * Route message ใน group context (no per-user state, no history)
 * ใช้ bot engine (keyword/flex) เท่านั้น — ไม่ใช้ AI mode ใน group
 * เพราะไม่อยากให้ AI mode ใน group กิน token
 */
async function routeGroupMessage(
  userText: string,
): Promise<{ messages: Awaited<ReturnType<typeof routeMessage>>['messages']; silentMode: boolean }> {
  const { botReply } = await import('../../services/bot-engine.js');
  return { messages: botReply(userText), silentMode: false };
}
