import type { messagingApi } from '@line/bot-sdk';
import { lineClient } from './client.js';
import { logger } from '../../lib/logger.js';

type Message = messagingApi.Message;

export async function reply(
  replyToken: string,
  messages: Message | Message[],
): Promise<void> {
  const list = Array.isArray(messages) ? messages : [messages];
  try {
    await lineClient.replyMessage({ replyToken, messages: list });
  } catch (err: unknown) {
    logger.error({ err, replyToken, count: list.length }, 'reply failed');
    throw err;
  }
}

export async function pushTo(
  to: string,
  messages: Message | Message[],
): Promise<void> {
  const list = Array.isArray(messages) ? messages : [messages];
  try {
    await lineClient.pushMessage({ to, messages: list });
  } catch (err) {
    logger.error({ err, to, count: list.length }, 'push failed');
    throw err;
  }
}

export function textMessage(text: string): Message {
  return { type: 'text', text };
}

export function textWithQuickReply(
  text: string,
  items: Array<{ label: string; data?: string; text?: string }>,
): Message {
  return {
    type: 'text',
    text,
    quickReply: {
      items: items.slice(0, 13).map((it) => ({
        type: 'action',
        action: it.data
          ? { type: 'postback', label: it.label, data: it.data, displayText: it.label }
          : { type: 'message', label: it.label, text: it.text ?? it.label },
      })),
    },
  };
}
