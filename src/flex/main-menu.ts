import type { messagingApi } from '@line/bot-sdk';
import { POSTBACK_ACTIONS } from '../config/constants.js';

export function mainMenuFlex(): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: 'เมนูหลัก ZenityX',
    contents: {
      type: 'bubble',
      size: 'mega',
      hero: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#10b981',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: 'ZENITYX',
            color: '#ffffff',
            weight: 'bold',
            size: 'xxl',
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
            text: 'สวัสดีครับ',
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'text',
            text: 'ผมเป็นผู้ช่วยอัตโนมัติ พร้อมช่วยคุณตอบคำถามและแนะนำคอร์ส เลือกได้จากเมนูด้านล่าง',
            wrap: true,
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
              displayText: 'เปลี่ยนไปคุยกับ AI',
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'postback',
              label: 'ติดต่อ/สมัครเรียน',
              data: POSTBACK_ACTIONS.LEAD_FORM_START,
              displayText: 'ติดต่อ/สมัครเรียน',
            },
          },
          {
            type: 'button',
            style: 'link',
            action: {
              type: 'postback',
              label: 'คุยกับแอดมิน',
              data: POSTBACK_ACTIONS.MODE_HUMAN,
              displayText: 'คุยกับแอดมิน',
            },
          },
        ],
      },
    },
  };
}
