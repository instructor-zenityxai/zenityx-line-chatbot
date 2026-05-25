import type { messagingApi } from '@line/bot-sdk';
import type { Course } from '../types/domain.js';
import { POSTBACK_ACTIONS } from '../config/constants.js';

const FALLBACK_IMAGE =
  'https://zenityxai.com/wp-content/uploads/2025/11/Poster-AI-Content-Workshop-825x1024.webp';

export function courseDetailFlex(course: Course): messagingApi.FlexMessage {
  const infoRows: messagingApi.FlexComponent[] = [];

  if (course.duration) infoRows.push(infoRow('⏱', 'ระยะเวลา', course.duration));
  if (course.price) infoRows.push(infoRow('💰', 'ราคา', course.price));
  if (course.format) infoRows.push(infoRow('📍', 'รูปแบบ', course.format));
  if (course.location) infoRows.push(infoRow('🏢', 'สถานที่', course.location));

  const targetText = course.targetAudience?.length
    ? course.targetAudience.map((t) => `• ${t}`).join('\n')
    : null;

  const getText = course.whatYouGet?.length
    ? course.whatYouGet.map((t) => `✓ ${t}`).join('\n')
    : null;

  const body: messagingApi.FlexComponent[] = [
    {
      type: 'text',
      text: course.title,
      weight: 'bold',
      size: 'xl',
      wrap: true,
      color: '#111827',
    },
    {
      type: 'text',
      text: course.tagline,
      size: 'sm',
      color: '#6b7280',
      wrap: true,
    },
  ];

  if (infoRows.length > 0) {
    body.push({ type: 'separator', margin: 'lg' });
    body.push({
      type: 'box',
      layout: 'vertical',
      margin: 'lg',
      spacing: 'sm',
      contents: infoRows,
    });
  }

  if (targetText) {
    body.push({ type: 'separator', margin: 'lg' });
    body.push({
      type: 'box',
      layout: 'vertical',
      margin: 'lg',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: '🎯 เหมาะกับใคร',
          weight: 'bold',
          size: 'sm',
          color: '#111827',
        },
        {
          type: 'text',
          text: targetText,
          wrap: true,
          size: 'sm',
          color: '#374151',
        },
      ],
    });
  }

  if (getText) {
    body.push({ type: 'separator', margin: 'lg' });
    body.push({
      type: 'box',
      layout: 'vertical',
      margin: 'lg',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: '✨ สิ่งที่จะได้รับ',
          weight: 'bold',
          size: 'sm',
          color: '#111827',
        },
        {
          type: 'text',
          text: getText,
          wrap: true,
          size: 'sm',
          color: '#374151',
        },
      ],
    });
  }

  return {
    type: 'flex',
    altText: `${course.title} - ${course.tagline}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      hero: {
        type: 'image',
        url: course.coverImage ?? FALLBACK_IMAGE,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: body,
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
              label: '📝 สมัครเรียนคอร์สนี้',
              data: `${POSTBACK_ACTIONS.LEAD_FORM_START}&interest=${encodeURIComponent(course.title)}`,
              displayText: `สมัคร ${course.title}`,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'uri',
              label: '🔗 ดูในเว็บไซต์',
              uri: course.url,
            },
          },
          {
            type: 'button',
            style: 'link',
            action: {
              type: 'postback',
              label: '🔙 ดูคอร์สอื่น',
              data: POSTBACK_ACTIONS.COURSE_LIST,
              displayText: 'ดูคอร์สทั้งหมด',
            },
          },
        ],
      },
    },
  };
}

function infoRow(emoji: string, label: string, value: string): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'baseline',
    spacing: 'sm',
    contents: [
      { type: 'text', text: emoji, size: 'sm', flex: 0 },
      { type: 'text', text: label, color: '#6b7280', size: 'sm', flex: 2 },
      { type: 'text', text: value, color: '#111827', size: 'sm', flex: 5, wrap: true },
    ],
  };
}
