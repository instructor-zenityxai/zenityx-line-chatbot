import type { messagingApi } from '@line/bot-sdk';
import type { Course } from '../types/domain.js';
import { POSTBACK_ACTIONS } from '../config/constants.js';

const FALLBACK_IMAGE =
  'https://zenityxai.com/wp-content/uploads/2025/11/Poster-AI-Content-Workshop-825x1024.webp';

// LINE Flex Carousel limit: max 12 bubbles ต่อ carousel
const MAX_BUBBLES_PER_CAROUSEL = 12;

/**
 * Split courses เป็น carousel messages (ถ้ามากกว่า 12)
 * เช่น 16 courses → 2 carousels (8 + 8)
 */
export function courseListMessages(
  courses: Course[],
): messagingApi.Message[] {
  if (courses.length === 0) {
    return [{ type: 'text', text: 'ยังไม่มีคอร์สครับ' }];
  }

  if (courses.length <= MAX_BUBBLES_PER_CAROUSEL) {
    return [courseListCarousel(courses)];
  }

  // Split into chunks
  const chunks: Course[][] = [];
  const half = Math.ceil(courses.length / 2);
  chunks.push(courses.slice(0, half));
  chunks.push(courses.slice(half));

  const messages: messagingApi.Message[] = [
    {
      type: 'text',
      text: `ZENITYX มี ${courses.length} คอร์สครับ เลื่อนดูได้เลย (แบ่งเป็น ${chunks.length} ชุด)`,
    },
    ...chunks.map((chunk, idx) =>
      courseListCarousel(chunk, `ชุดที่ ${idx + 1}/${chunks.length}`),
    ),
  ];
  return messages;
}

export function courseListCarousel(
  courses: Course[],
  altSuffix?: string,
): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: `คอร์ส ZENITYX${altSuffix ? ` (${altSuffix})` : ''} ${courses.length} ตัว`,
    contents: {
      type: 'carousel',
      contents: courses.slice(0, MAX_BUBBLES_PER_CAROUSEL).map((c) => courseBubble(c)),
    },
  };
}

function courseBubble(course: Course): messagingApi.FlexBubble {
  return {
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
      contents: [
        {
          type: 'text',
          text: course.title,
          weight: 'bold',
          size: 'lg',
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
        {
          type: 'separator',
          margin: 'md',
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'md',
          spacing: 'xs',
          contents: course.tags?.slice(0, 4).map((tag) => ({
            type: 'text',
            text: `#${tag}`,
            size: 'xs',
            color: '#10b981',
          })) ?? [],
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
            label: 'ดูรายละเอียด',
            data: `${POSTBACK_ACTIONS.COURSE_DETAIL_PREFIX}${course.id}`,
            displayText: `${course.title}`,
          },
        },
        {
          type: 'button',
          style: 'secondary',
          action: {
            type: 'postback',
            label: 'สมัครเรียน',
            data: `${POSTBACK_ACTIONS.LEAD_FORM_START}&interest=${encodeURIComponent(course.title)}`,
            displayText: `สมัคร ${course.title}`,
          },
        },
      ],
    },
  };
}
