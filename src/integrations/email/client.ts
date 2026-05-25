import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface LeadEmailPayload {
  name: string;
  phone: string;
  email?: string | null;
  interest?: string | null;
  lineUserId?: string | null;
  source: string;
  createdAt: string;
}

export async function sendLeadEmail(lead: LeadEmailPayload): Promise<void> {
  if (!resend) {
    logger.warn('Resend not configured (RESEND_API_KEY missing) — skipping email');
    return;
  }

  const subject = `🔔 [ZenityX Lead] ${lead.name} สนใจ ${lead.interest ?? 'คอร์ส'}`;
  const html = `
    <div style="font-family:sans-serif;max-width:560px;padding:20px;">
      <h2 style="color:#10b981;margin:0 0 16px;">🎯 มี Lead ใหม่จาก LINE Bot</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px;background:#f3f4f6;width:120px;"><strong>ชื่อ</strong></td><td style="padding:8px;">${escapeHtml(lead.name)}</td></tr>
        <tr><td style="padding:8px;background:#f3f4f6;"><strong>เบอร์</strong></td><td style="padding:8px;">${escapeHtml(lead.phone)}</td></tr>
        ${lead.email ? `<tr><td style="padding:8px;background:#f3f4f6;"><strong>อีเมล</strong></td><td style="padding:8px;">${escapeHtml(lead.email)}</td></tr>` : ''}
        <tr><td style="padding:8px;background:#f3f4f6;"><strong>ความสนใจ</strong></td><td style="padding:8px;">${escapeHtml(lead.interest ?? '-')}</td></tr>
        <tr><td style="padding:8px;background:#f3f4f6;"><strong>Source</strong></td><td style="padding:8px;">${escapeHtml(lead.source)}</td></tr>
        ${lead.lineUserId ? `<tr><td style="padding:8px;background:#f3f4f6;"><strong>LINE ID</strong></td><td style="padding:8px;font-family:monospace;font-size:12px;">${escapeHtml(lead.lineUserId)}</td></tr>` : ''}
        <tr><td style="padding:8px;background:#f3f4f6;"><strong>เวลา</strong></td><td style="padding:8px;">${escapeHtml(lead.createdAt)}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">ส่งจาก ZenityX LINE Chatbot</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: env.LEAD_FROM_EMAIL,
      to: env.LEAD_NOTIFY_EMAIL,
      subject,
      html,
    });
    logger.info({ to: env.LEAD_NOTIFY_EMAIL }, 'lead email sent');
  } catch (err) {
    logger.error({ err }, 'failed to send lead email');
    // Swallow — ไม่ blocking flow ของ lead capture
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
