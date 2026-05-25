import type { messagingApi } from '@line/bot-sdk';
import { POSTBACK_ACTIONS } from '../config/constants.js';

export function aiModeEnterFlex(): messagingApi.TextMessage {
  return {
    type: 'text',
    text: '🤖 เข้าสู่โหมด AI แล้วครับ\n\nผมจะเข้าใจคำถามเชิงลึก ตอบจาก knowledge ของ ZENITYX ได้ ลองถามมาได้เลยครับ\n\n💡 พิมพ์ "เมนู" เพื่อกลับเมนูหลัก',
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '🏠 กลับเมนู',
            data: POSTBACK_ACTIONS.MODE_BOT,
            displayText: 'เมนู',
          },
        },
        {
          type: 'action',
          action: {
            type: 'postback',
            label: '👤 คุยกับแอดมิน',
            data: POSTBACK_ACTIONS.MODE_HUMAN,
            displayText: 'คุยกับแอดมิน',
          },
        },
      ],
    },
  };
}

export function botModeEnterFlex(): messagingApi.TextMessage {
  return {
    type: 'text',
    text: '🏠 กลับสู่เมนูหลักแล้วครับ ลองเลือกจากเมนูด้านล่างได้เลย',
  };
}

export function humanModeEnterFlex(): messagingApi.TextMessage {
  return {
    type: 'text',
    text: '👤 รับทราบครับ ได้แจ้งทีมงานแล้ว\n\nรอสักครู่ ทีมจะติดต่อกลับโดยเร็วที่สุดครับ ⏰\n\n💡 ถ้าอยากกลับมาคุยกับบอท พิมพ์ "เมนู" ได้เลย',
  };
}
