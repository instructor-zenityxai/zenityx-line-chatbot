import type { messagingApi } from '@line/bot-sdk';
import { getUser, setMode, touchActive, setMetadata } from './user-service.js';
import { botReply } from './bot-engine.js';
import { aiReply } from './ai-engine.js';
import { saveMessage } from './message-store.js';
import { mainMenuFlex } from '../flex/main-menu.js';
import { aiModeEnterFlex, botModeEnterFlex, humanModeEnterFlex } from '../flex/mode-switch.js';
import {
  leadFormPromptText,
  leadInterestQuickReply,
  leadConfirmFlex,
} from '../flex/lead-form.js';
import { textMessage } from '../integrations/line/replies.js';
import { pushTo } from '../integrations/line/replies.js';
import { env } from '../config/env.js';
import {
  MODES,
  RESET_KEYWORDS,
  HUMAN_HANDOFF_KEYWORDS,
} from '../config/constants.js';
import { listCourses } from './knowledge-service.js';
import type { LeadDraft } from '../types/domain.js';
import { logger } from '../lib/logger.js';

interface RouteResult {
  messages: messagingApi.Message[];
  silentMode?: boolean;  // true = human mode, ไม่ตอบ
}

export async function routeMessage(
  lineUserId: string,
  userText: string,
): Promise<RouteResult> {
  await touchActive(lineUserId);
  const user = await getUser(lineUserId);
  if (!user) {
    logger.warn({ lineUserId }, 'user not found in router — should be upserted on follow');
    return { messages: [textMessage('ขออภัยครับ ระบบขัดข้อง ลองพิมพ์ "เมนู" อีกครั้ง')] };
  }

  const trimmed = userText.trim();
  const lower = trimmed.toLowerCase();
  const draft = getLeadDraft(user.metadata);

  // ===== Priority 1: Special keywords always override =====
  // (rules out: lead form ค้าง + ทำให้ใช้ "เมนู"/"แอดมิน" ไม่ได้)

  // Reset to bot — ยกเลิก lead form ด้วย ถ้ามี
  if (RESET_KEYWORDS.includes(lower)) {
    const cleanedMeta = draft ? removeLeadDraft(user.metadata) : user.metadata;
    if (draft) await setMetadata(lineUserId, cleanedMeta);
    if (user.current_mode !== MODES.BOT) {
      await setMode(lineUserId, MODES.BOT);
    }
    return { messages: [botModeEnterFlex(), mainMenuFlex()] };
  }

  // Handoff to human — ยกเลิก lead form ด้วย
  if (HUMAN_HANDOFF_KEYWORDS.some((kw) => lower.includes(kw))) {
    if (draft) await setMetadata(lineUserId, removeLeadDraft(user.metadata));
    await setMode(lineUserId, MODES.HUMAN);
    await notifyAdminHandoff(lineUserId, user.display_name ?? null);
    return { messages: [humanModeEnterFlex()] };
  }

  // Explicit cancel during lead form
  if (draft && (lower === 'ยกเลิก' || lower === 'cancel')) {
    await setMetadata(lineUserId, removeLeadDraft(user.metadata));
    return { messages: [textMessage('ยกเลิกการกรอกข้อมูลแล้วครับ'), mainMenuFlex()] };
  }

  // ===== Priority 2: Continue lead form =====
  if (draft) {
    return handleLeadStep(lineUserId, user.metadata, draft, trimmed);
  }

  // Dispatch ตาม mode
  switch (user.current_mode) {
    case MODES.BOT:
      return { messages: botReply(trimmed) };

    case MODES.AI: {
      const reply = await aiReply(lineUserId, trimmed);
      await saveMessage({
        lineUserId,
        direction: 'outbound',
        source: 'ai',
        messageType: 'text',
        content: { text: reply },
      });
      return { messages: [textMessage(reply)] };
    }

    case MODES.HUMAN:
      // silent — admin จัดการ
      return { messages: [], silentMode: true };

    default:
      return { messages: botReply(trimmed) };
  }
}

export async function switchMode(
  lineUserId: string,
  toMode: 'bot' | 'ai' | 'human',
): Promise<messagingApi.Message[]> {
  // ยกเลิก lead form ค้าง (ถ้ามี) — กัน mode switch ขัดกับ lead form
  const user = await getUser(lineUserId);
  if (user && getLeadDraft(user.metadata)) {
    await setMetadata(lineUserId, removeLeadDraft(user.metadata));
    logger.info({ lineUserId, toMode }, 'cleared lead draft on mode switch');
  }

  await setMode(lineUserId, toMode);
  switch (toMode) {
    case 'ai':
      return [aiModeEnterFlex()];
    case 'human': {
      await notifyAdminHandoff(lineUserId, user?.display_name ?? null);
      return [humanModeEnterFlex()];
    }
    case 'bot':
    default:
      return [botModeEnterFlex(), mainMenuFlex()];
  }
}

async function notifyAdminHandoff(
  lineUserId: string,
  displayName: string | null,
): Promise<void> {
  if (!env.LINE_ADMIN_GROUP_ID) {
    logger.warn('LINE_ADMIN_GROUP_ID not set — handoff alert skipped');
    return;
  }
  const text = [
    '[ลูกค้าขอคุยกับแอดมิน]',
    '',
    `ชื่อ: ${displayName ?? '(ไม่ทราบชื่อ)'}`,
    `LINE ID: ${lineUserId}`,
    '',
    'เปิด LINE OA Manager → Chat tab เพื่อ reply ครับ',
  ].join('\n');
  try {
    await pushTo(env.LINE_ADMIN_GROUP_ID, { type: 'text', text });
  } catch (err) {
    logger.error({ err }, 'failed to notify admin handoff');
  }
}

// ============= Lead Form State Machine =============

function getLeadDraft(metadata: Record<string, unknown>): LeadDraft | null {
  const draft = metadata?.['lead_draft'];
  if (!draft || typeof draft !== 'object') return null;
  return draft as LeadDraft;
}

function removeLeadDraft(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const { lead_draft: _, ...rest } = metadata;
  return rest;
}

async function setLeadDraft(
  lineUserId: string,
  metadata: Record<string, unknown>,
  draft: LeadDraft,
): Promise<void> {
  await setMetadata(lineUserId, { ...metadata, lead_draft: draft });
}

async function handleLeadStep(
  lineUserId: string,
  metadata: Record<string, unknown>,
  draft: LeadDraft,
  userText: string,
): Promise<RouteResult> {
  const trimmed = userText.trim();

  switch (draft.step) {
    case 'name': {
      if (trimmed.length < 1 || trimmed.length > 80) {
        return { messages: [textMessage('กรุณาพิมพ์ชื่อ (1-80 ตัวอักษร) ครับ')] };
      }
      const next: LeadDraft = { ...draft, name: trimmed, step: 'phone' };
      await setLeadDraft(lineUserId, metadata, next);
      return { messages: [leadFormPromptText(next)] };
    }

    case 'phone': {
      const phone = trimmed.replace(/[\s-]/g, '');
      if (!/^\d{9,12}$/.test(phone)) {
        return { messages: [textMessage('เบอร์ดูแปลก ๆ ครับ ลองพิมพ์ใหม่ (9-12 ตัวเลข)')] };
      }
      const next: LeadDraft = { ...draft, phone, step: 'email' };
      await setLeadDraft(lineUserId, metadata, next);
      return { messages: [leadFormPromptText(next)] };
    }

    case 'email': {
      let email: string | undefined;
      if (trimmed.toLowerCase() === 'ข้าม' || trimmed.toLowerCase() === 'skip') {
        email = undefined;
      } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        email = trimmed;
      } else {
        return {
          messages: [
            textMessage('อีเมลดูไม่ถูกต้องครับ ลองใหม่ หรือพิมพ์ "ข้าม" ก็ได้'),
          ],
        };
      }
      const next: LeadDraft = { ...draft, email, step: 'interest' };
      await setLeadDraft(lineUserId, metadata, next);
      return { messages: [leadInterestQuickReply(listCourses())] };
    }

    case 'interest':
      // จัดการผ่าน postback แทน text — ถ้า user พิมพ์ตอบ ก็เก็บ free text
      if (trimmed.length > 0) {
        const next: LeadDraft = { ...draft, interest: trimmed, step: 'confirm' };
        await setLeadDraft(lineUserId, metadata, next);
        return { messages: [leadConfirmFlex(next)] };
      }
      return { messages: [leadInterestQuickReply(listCourses())] };

    case 'confirm':
      // confirm ผ่าน postback button เท่านั้น — ถ้าพิมพ์ตอบ ตีความว่าอยากแก้
      return {
        messages: [
          textMessage('กรุณากดปุ่ม "ยืนยัน" หรือ "ยกเลิก" ในการ์ดด้านบนครับ'),
        ],
      };

    default:
      return { messages: [textMessage('ขออภัย ขอเริ่มใหม่นะครับ พิมพ์ "เมนู"')] };
  }
}

export async function startLeadForm(
  lineUserId: string,
  preselectedInterest?: string,
): Promise<messagingApi.Message[]> {
  const user = await getUser(lineUserId);
  if (!user) return [textMessage('ขออภัยครับ ระบบขัดข้อง')];
  const draft: LeadDraft = preselectedInterest
    ? { step: 'name', interest: preselectedInterest }
    : { step: 'name' };
  await setLeadDraft(lineUserId, user.metadata, draft);
  return [leadFormPromptText(draft)];
}

export async function setLeadInterestAndConfirm(
  lineUserId: string,
  interest: string,
): Promise<messagingApi.Message[]> {
  const user = await getUser(lineUserId);
  if (!user) return [textMessage('ขออภัยครับ ระบบขัดข้อง')];
  const draft = getLeadDraft(user.metadata);
  if (!draft) {
    return [textMessage('Session ของฟอร์มหมดอายุครับ พิมพ์ "เมนู" แล้วเริ่มใหม่')];
  }
  const next: LeadDraft = { ...draft, interest, step: 'confirm' };
  await setLeadDraft(lineUserId, user.metadata, next);
  return [leadConfirmFlex(next)];
}

export async function submitLeadForm(
  lineUserId: string,
  submitter: (lineUserId: string, draft: LeadDraft) => Promise<string>,
): Promise<messagingApi.Message[]> {
  const user = await getUser(lineUserId);
  if (!user) return [textMessage('ขออภัยครับ ระบบขัดข้อง')];
  const draft = getLeadDraft(user.metadata);
  if (!draft || !draft.name || !draft.phone) {
    return [textMessage('ข้อมูลไม่ครบครับ พิมพ์ "เมนู" แล้วลองใหม่')];
  }
  try {
    await submitter(lineUserId, draft);
    await setMetadata(lineUserId, removeLeadDraft(user.metadata));
    return [
      textMessage(
        'บันทึกข้อมูลเรียบร้อยครับ ขอบคุณคุณ ' +
          draft.name +
          ' มากครับ\n\nทีมงานจะติดต่อกลับโดยเร็วที่สุด (ภายใน 24 ชั่วโมงในวันทำการ)',
      ),
    ];
  } catch (err) {
    logger.error({ err, lineUserId }, 'submit lead failed');
    return [
      textMessage(
        'ขออภัยครับ บันทึกข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง หรือติดต่อ admin@zenityxai.com',
      ),
    ];
  }
}

export async function cancelLeadForm(
  lineUserId: string,
): Promise<messagingApi.Message[]> {
  const user = await getUser(lineUserId);
  if (!user) return [textMessage('ขออภัยครับ ระบบขัดข้อง')];
  await setMetadata(lineUserId, removeLeadDraft(user.metadata));
  return [textMessage('ยกเลิกแล้วครับ'), mainMenuFlex()];
}
