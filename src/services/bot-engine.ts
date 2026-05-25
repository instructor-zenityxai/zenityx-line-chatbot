import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { messagingApi } from '@line/bot-sdk';
import { findCourseById, listCourses } from './knowledge-service.js';
import { mainMenuFlex } from '../flex/main-menu.js';
import { courseListMessages } from '../flex/course-list.js';
import { courseDetailFlex } from '../flex/course-detail.js';
import { textMessage } from '../integrations/line/replies.js';
import { logger } from '../lib/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

interface FAQReply {
  type: 'text' | 'course_list' | 'course_detail' | 'main_menu';
  text?: string;
  courseId?: string;
}

interface FAQRule {
  keywords: string[];
  reply: FAQReply;
}

interface FAQ {
  rules: FAQRule[];
  fallback: FAQReply;
}

let cachedFaq: FAQ | null = null;

function loadFaq(): FAQ {
  if (cachedFaq) return cachedFaq;
  const raw = readFileSync(resolve(repoRoot, 'content/faq.json'), 'utf-8');
  cachedFaq = JSON.parse(raw) as FAQ;
  return cachedFaq;
}

export function botReply(userText: string): messagingApi.Message[] {
  const faq = loadFaq();
  const lower = userText.toLowerCase().trim();

  // 1. Match exact rule
  const matched = faq.rules.find((rule) =>
    rule.keywords.some((kw) => lower.includes(kw.toLowerCase())),
  );

  if (matched) {
    logger.debug({ matched: matched.keywords[0] }, 'bot keyword matched');
    return replyToMessages(matched.reply);
  }

  // 2. Fallback
  logger.debug({ userText: lower.slice(0, 30) }, 'bot fallback');
  return replyToMessages(faq.fallback);
}

function replyToMessages(reply: FAQReply): messagingApi.Message[] {
  switch (reply.type) {
    case 'text':
      return [textMessage(reply.text ?? '...')];
    case 'course_list':
      return courseListMessages(listCourses());
    case 'course_detail': {
      const course = reply.courseId ? findCourseById(reply.courseId) : undefined;
      if (!course) return [textMessage('ขอโทษครับ ผมหาคอร์สนี้ไม่เจอ')];
      return [courseDetailFlex(course)];
    }
    case 'main_menu': {
      const messages: messagingApi.Message[] = [];
      if (reply.text) messages.push(textMessage(reply.text));
      messages.push(mainMenuFlex());
      return messages;
    }
  }
}

export function clearFaqCache(): void {
  cachedFaq = null;
}
