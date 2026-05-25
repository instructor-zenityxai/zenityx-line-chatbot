import type { messagingApi } from '@line/bot-sdk';
import { POSTBACK_ACTIONS } from '../config/constants.js';

export function welcomeFlex(displayName?: string | null): messagingApi.FlexMessage {
  const greet = displayName
    ? `สวัสดีครับ คุณ${displayName}`
    : 'สวัสดีครับ ยินดีต้อนรับ';

  return {
    type: 'flex',
    altText: greet,
    contents: {
      type: 'bubble',
      size: 'mega',
      hero: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#10b981',
        paddingAll: '24px',
        contents: [
          {
            type: 'text',
            text: 'ยินดีต้อนรับสู่',
            color: '#d1fae5',
            size: 'sm',
          },
          {
            type: 'text',
            text: 'ZENITYX',
            color: '#ffffff',
            weight: 'bold',
            size: 'xxl',
            margin: 'sm',
          },
          {
            type: 'text',
            text: 'ศูนย์กลาง AI ครบวงจร',
            color: '#d1fae5',
            size: 'sm',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: greet,
            weight: 'bold',
            size: 'lg',
            wrap: true,
          },
          {
            type: 'text',
            text: 'ผมเป็นผู้ช่วยอัตโนมัติของ ZENITYX พร้อมตอบคำถามและแนะนำคอร์สตลอด 24 ชั่วโมงครับ',
            wrap: true,
            size: 'sm',
            color: '#6b7280',
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: 'สิ่งที่ผมช่วยได้',
                weight: 'bold',
                size: 'sm',
              },
              {
                type: 'text',
                text: '- แนะนำคอร์สที่เหมาะกับคุณ\n- ตอบคำถามทั่วไปเกี่ยวกับสถาบัน\n- เก็บข้อมูลให้ทีมงานติดต่อกลับ\n- สลับไปคุยกับแอดมินตัวจริงได้',
                wrap: true,
                size: 'sm',
                color: '#6b7280',
              },
            ],
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
              label: 'ดูคอร์สทั้งหมด',
              data: POSTBACK_ACTIONS.COURSE_LIST,
              displayText: 'ดูคอร์สทั้งหมด',
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'postback',
              label: 'ถาม AI',
              data: POSTBACK_ACTIONS.MODE_AI,
              displayText: 'คุยกับ AI',
            },
          },
        ],
      },
    },
  };
}
