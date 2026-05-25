import type { TextEventMessage } from '@line/bot-sdk';
import { env } from '../config/env.js';
import { GROUP_PREFIXES } from '../config/constants.js';

interface FilterResult {
  shouldReply: boolean;
  /** ข้อความที่ตัด @mention / prefix ออกแล้ว (ใช้ส่งต่อ router) */
  cleanText: string;
  /** เหตุผลที่ตอบ — ไว้ใช้ log */
  reason: 'mention' | 'prefix' | null;
}

/**
 * ตัดสินว่า bot ควรตอบใน group/room หรือไม่
 *
 * ตอบเมื่อ:
 *   1. ข้อความมี @mention bot (LINE mention object)
 *   2. ข้อความขึ้นต้นด้วย /zen, /bot, /zenityx, @zen
 *
 * Return cleanText = ข้อความที่ตัด mention/prefix ออกแล้ว
 */
export function filterGroupMessage(message: TextEventMessage): FilterResult {
  const text = message.text;
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // 1. Check @mention bot
  const botUserId = env.LINE_BOT_USER_ID;
  if (botUserId && message.mention?.mentionees) {
    const mentioned = message.mention.mentionees.find(
      (m) => m.type === 'user' && m.userId === botUserId,
    );
    if (mentioned) {
      // ตัด @mention text ออก
      const cleanText = stripMentionRange(text, mentioned.index, mentioned.length).trim();
      return {
        shouldReply: true,
        cleanText: cleanText || 'เมนู',
        reason: 'mention',
      };
    }
  }

  // 2. Check prefix
  const matchedPrefix = GROUP_PREFIXES.find((p) => lower.startsWith(p.toLowerCase()));
  if (matchedPrefix) {
    const cleanText = trimmed.slice(matchedPrefix.length).trim();
    return {
      shouldReply: true,
      cleanText: cleanText || 'เมนู',
      reason: 'prefix',
    };
  }

  // 3. Default: silent
  return { shouldReply: false, cleanText: text, reason: null };
}

function stripMentionRange(text: string, index: number, length: number): string {
  return text.slice(0, index) + text.slice(index + length);
}
