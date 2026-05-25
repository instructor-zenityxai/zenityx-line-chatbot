import { supabase } from '../integrations/supabase/client.js';
import { sendLeadEmail } from '../integrations/email/client.js';
import { pushTo } from '../integrations/line/replies.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import type { LeadDraft } from '../types/domain.js';

export async function createLead(
  lineUserId: string | null,
  draft: LeadDraft,
): Promise<string> {
  if (!draft.name || !draft.phone) {
    throw new Error('name and phone required');
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      line_user_id: lineUserId,
      name: draft.name,
      phone: draft.phone,
      email: draft.email ?? null,
      interest: draft.interest ?? null,
      source: 'line_form',
      status: 'new',
    })
    .select()
    .single();

  if (error) {
    logger.error({ err: error }, 'create lead failed');
    throw error;
  }

  const lead = data;
  logger.info({ leadId: lead.id, name: lead.name }, 'lead created');

  // Notify ทั้ง 2 ช่อง parallel
  await Promise.allSettled([
    notifyLineGroup(lead),
    sendLeadEmail({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      interest: lead.interest,
      lineUserId: lead.line_user_id,
      source: lead.source,
      createdAt: lead.created_at,
    }),
  ]);

  // Mark notified
  await supabase
    .from('leads')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', lead.id);

  return lead.id;
}

async function notifyLineGroup(lead: {
  name: string;
  phone: string;
  email: string | null;
  interest: string | null;
  line_user_id: string | null;
}): Promise<void> {
  if (!env.LINE_ADMIN_GROUP_ID) {
    logger.warn('LINE_ADMIN_GROUP_ID not set — skipping group notify');
    return;
  }

  const text = [
    '🔔 มี Lead ใหม่จาก LINE Bot',
    '',
    `👤 ชื่อ: ${lead.name}`,
    `📞 เบอร์: ${lead.phone}`,
    `📧 อีเมล: ${lead.email ?? '(ไม่ระบุ)'}`,
    `🎯 สนใจ: ${lead.interest ?? '-'}`,
    lead.line_user_id ? `🆔 LINE: ${lead.line_user_id}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await pushTo(env.LINE_ADMIN_GROUP_ID, { type: 'text', text });
  } catch (err) {
    logger.error({ err }, 'failed to push to admin group');
  }
}
