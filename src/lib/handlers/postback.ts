import type { WebhookEvent } from '@line/bot-sdk';
import { upsertUser } from '../../services/user-service.js';
import {
  switchMode,
  startLeadForm,
  setLeadInterestAndConfirm,
  submitLeadForm,
  cancelLeadForm,
} from '../../services/conversation-router.js';
import { createLead } from '../../services/lead-service.js';
import { findCourseById, listCourses } from '../../services/knowledge-service.js';
import { courseListMessages } from '../../flex/course-list.js';
import { courseDetailFlex } from '../../flex/course-detail.js';
import { reply } from '../../integrations/line/replies.js';
import { textMessage } from '../../integrations/line/replies.js';
import { saveMessage, logEvent } from '../../services/message-store.js';
import { POSTBACK_ACTIONS } from '../../config/constants.js';
import { logger } from '../logger.js';

export async function handlePostback(event: WebhookEvent): Promise<void> {
  if (event.type !== 'postback') return;
  const lineUserId = event.source.userId;
  if (!lineUserId) return;

  await upsertUser({ lineUserId });
  await logEvent('postback', event, lineUserId);

  const data = event.postback.data;
  logger.debug({ lineUserId, data }, 'postback received');

  await saveMessage({
    lineUserId,
    direction: 'inbound',
    source: 'user',
    messageType: 'postback',
    content: { data },
  });

  // Mode switches
  if (data === POSTBACK_ACTIONS.MODE_BOT) {
    await sendReply(event.replyToken, await switchMode(lineUserId, 'bot'), lineUserId);
    return;
  }
  if (data === POSTBACK_ACTIONS.MODE_AI) {
    await sendReply(event.replyToken, await switchMode(lineUserId, 'ai'), lineUserId);
    return;
  }
  if (data === POSTBACK_ACTIONS.MODE_HUMAN) {
    await sendReply(event.replyToken, await switchMode(lineUserId, 'human'), lineUserId);
    return;
  }

  // Course list (auto-split ถ้า > 12 courses)
  if (data === POSTBACK_ACTIONS.COURSE_LIST) {
    await sendReply(event.replyToken, courseListMessages(listCourses()), lineUserId);
    return;
  }

  // Course detail
  if (data.startsWith(POSTBACK_ACTIONS.COURSE_DETAIL_PREFIX) && !data.includes('=list')) {
    const courseId = data.substring(POSTBACK_ACTIONS.COURSE_DETAIL_PREFIX.length);
    const course = findCourseById(courseId);
    if (!course) {
      await sendReply(event.replyToken, [textMessage('ไม่พบคอร์สนี้ครับ')], lineUserId);
      return;
    }
    await sendReply(event.replyToken, [courseDetailFlex(course)], lineUserId);
    return;
  }

  // Lead form start (อาจมี &interest=<title> ต่อท้าย)
  if (data.startsWith(POSTBACK_ACTIONS.LEAD_FORM_START)) {
    const params = parseQuery(data);
    const interest = params.get('interest') ?? undefined;
    await sendReply(event.replyToken, await startLeadForm(lineUserId, interest), lineUserId);
    return;
  }

  // Lead interest selection
  if (data.startsWith(POSTBACK_ACTIONS.LEAD_INTEREST_PREFIX)) {
    const choice = data.substring(POSTBACK_ACTIONS.LEAD_INTEREST_PREFIX.length);
    const interest = resolveInterest(choice);
    await sendReply(event.replyToken, await setLeadInterestAndConfirm(lineUserId, interest), lineUserId);
    return;
  }

  // Lead form submit
  if (data === POSTBACK_ACTIONS.LEAD_FORM_SUBMIT) {
    const messages = await submitLeadForm(lineUserId, async (uid, draft) => createLead(uid, draft));
    await sendReply(event.replyToken, messages, lineUserId);
    return;
  }

  // Lead cancel
  if (data === POSTBACK_ACTIONS.LEAD_CANCEL) {
    await sendReply(event.replyToken, await cancelLeadForm(lineUserId), lineUserId);
    return;
  }

  logger.warn({ lineUserId, data }, 'unknown postback');
  await sendReply(event.replyToken, [textMessage('คำสั่งไม่รู้จัก พิมพ์ "เมนู" เพื่อเริ่มใหม่')], lineUserId);
}

function parseQuery(data: string): URLSearchParams {
  const idx = data.indexOf('&');
  if (idx < 0) return new URLSearchParams();
  return new URLSearchParams(data.substring(idx + 1));
}

function resolveInterest(choice: string): string {
  if (choice === 'other') return 'อื่น ๆ / ยังไม่แน่ใจ';
  if (choice === 'in-house') return 'In-House Training';
  const course = findCourseById(choice);
  return course?.title ?? choice;
}

async function sendReply(
  replyToken: string,
  messages: Awaited<ReturnType<typeof switchMode>>,
  lineUserId: string,
): Promise<void> {
  if (messages.length === 0) return;
  await reply(replyToken, messages);
  for (const msg of messages) {
    const messageType =
      msg.type === 'text' ? 'text' : msg.type === 'flex' ? 'flex' : null;
    if (!messageType) continue;
    await saveMessage({
      lineUserId,
      direction: 'outbound',
      source: 'bot',
      messageType,
      content: msg as unknown as Record<string, unknown>,
    });
  }
}
