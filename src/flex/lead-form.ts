import type { messagingApi } from '@line/bot-sdk';
import type { Course, LeadDraft } from '../types/domain.js';
import { POSTBACK_ACTIONS } from '../config/constants.js';

/**
 * Lead form ใช้ multi-step:
 *   step=name    → ขอชื่อ (พิมพ์ข้อความ)
 *   step=phone   → ขอเบอร์
 *   step=email   → ขออีเมล (พิมพ์หรือ "ข้าม")
 *   step=interest→ เลือกคอร์ส (postback)
 *   step=confirm → ยืนยัน
 */

export function leadFormPromptText(draft: LeadDraft): messagingApi.TextMessage {
  switch (draft.step) {
    case 'name':
      return {
        type: 'text',
        text: '📝 ติดต่อ/สมัครเรียน\n\nกรุณาพิมพ์ชื่อของคุณครับ\n(หรือพิมพ์ "ยกเลิก" เพื่อยกเลิก)',
      };
    case 'phone':
      return {
        type: 'text',
        text: `ขอบคุณคุณ ${draft.name} ครับ 😊\n\nรบกวนพิมพ์เบอร์โทรศัพท์ที่ติดต่อได้ครับ`,
      };
    case 'email':
      return {
        type: 'text',
        text: 'รับทราบครับ\n\nขออีเมลด้วยครับ (พิมพ์ "ข้าม" ถ้าไม่สะดวกให้)',
      };
    case 'interest':
      return {
        type: 'text',
        text: 'เกือบเสร็จแล้วครับ ✨\n\nสนใจคอร์สไหนเป็นพิเศษ? กดเลือกได้เลยครับ',
        quickReply: { items: [] }, // จะถูก override ใน leadInterestQuickReply
      };
    case 'confirm':
      return {
        type: 'text',
        text: confirmText(draft),
      };
  }
}

export function leadInterestQuickReply(
  courses: Course[],
): messagingApi.TextMessage {
  const items: messagingApi.QuickReplyItem[] = courses.slice(0, 11).map((c) => ({
    type: 'action',
    action: {
      type: 'postback',
      label: trimLabel(c.title),
      data: `${POSTBACK_ACTIONS.LEAD_INTEREST_PREFIX}${c.id}`,
      displayText: c.title,
    },
  }));

  items.push({
    type: 'action',
    action: {
      type: 'postback',
      label: 'อื่น ๆ / ยังไม่แน่ใจ',
      data: `${POSTBACK_ACTIONS.LEAD_INTEREST_PREFIX}other`,
      displayText: 'อื่น ๆ',
    },
  });

  items.push({
    type: 'action',
    action: {
      type: 'postback',
      label: 'In-House Training',
      data: `${POSTBACK_ACTIONS.LEAD_INTEREST_PREFIX}in-house`,
      displayText: 'In-House Training',
    },
  });

  return {
    type: 'text',
    text: 'เกือบเสร็จแล้วครับ ✨\n\nสนใจคอร์สไหนเป็นพิเศษ? กดเลือกได้เลยครับ',
    quickReply: { items },
  };
}

export function leadConfirmFlex(draft: LeadDraft): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: 'ยืนยันข้อมูลของคุณ',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: '📋 ยืนยันข้อมูล',
            weight: 'bold',
            size: 'xl',
            color: '#111827',
          },
          { type: 'separator', margin: 'md' },
          row('ชื่อ', draft.name ?? '-'),
          row('เบอร์', draft.phone ?? '-'),
          row('อีเมล', draft.email ?? '(ไม่ระบุ)'),
          row('สนใจ', draft.interest ?? '-'),
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'text',
            text: 'ข้อมูลถูกต้องไหมครับ?',
            margin: 'md',
            size: 'sm',
            color: '#6b7280',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#10b981',
            action: {
              type: 'postback',
              label: '✅ ยืนยัน ส่งให้ทีม',
              data: POSTBACK_ACTIONS.LEAD_FORM_SUBMIT,
              displayText: 'ยืนยันข้อมูล',
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'postback',
              label: '❌ ยกเลิก',
              data: POSTBACK_ACTIONS.LEAD_CANCEL,
              displayText: 'ยกเลิก',
            },
          },
        ],
      },
    },
  };
}

function row(label: string, value: string): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    margin: 'md',
    contents: [
      { type: 'text', text: label, color: '#6b7280', size: 'sm', flex: 2 },
      { type: 'text', text: value, color: '#111827', size: 'sm', flex: 5, wrap: true },
    ],
  };
}

function confirmText(draft: LeadDraft): string {
  return [
    'ข้อมูลของคุณ:',
    `• ชื่อ: ${draft.name}`,
    `• เบอร์: ${draft.phone}`,
    `• อีเมล: ${draft.email ?? '(ไม่ระบุ)'}`,
    `• สนใจ: ${draft.interest}`,
    '',
    'ถูกต้องไหมครับ?',
  ].join('\n');
}

function trimLabel(text: string): string {
  return text.length <= 20 ? text : text.slice(0, 19) + '…';
}
