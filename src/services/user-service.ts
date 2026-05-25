import { supabase } from '../integrations/supabase/client.js';
import type { LineUser } from '../types/domain.js';
import type { UserMode } from '../config/constants.js';
import { logger } from '../lib/logger.js';

interface UpsertUserInput {
  lineUserId: string;
  displayName?: string | null;
  pictureUrl?: string | null;
  language?: string;
}

export async function upsertUser(input: UpsertUserInput): Promise<LineUser> {
  const { data: existing } = await supabase
    .from('line_users')
    .select('*')
    .eq('line_user_id', input.lineUserId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('line_users')
      .update({
        display_name: input.displayName ?? existing.display_name,
        picture_url: input.pictureUrl ?? existing.picture_url,
        language: input.language ?? existing.language,
        last_active_at: new Date().toISOString(),
        is_blocked: false,
      })
      .eq('line_user_id', input.lineUserId)
      .select()
      .single();
    if (error) throw error;
    return data as LineUser;
  }

  const { data, error } = await supabase
    .from('line_users')
    .insert({
      line_user_id: input.lineUserId,
      display_name: input.displayName ?? null,
      picture_url: input.pictureUrl ?? null,
      language: input.language ?? 'th',
      current_mode: 'bot',
    })
    .select()
    .single();
  if (error) throw error;
  return data as LineUser;
}

export async function getUser(lineUserId: string): Promise<LineUser | null> {
  const { data, error } = await supabase
    .from('line_users')
    .select('*')
    .eq('line_user_id', lineUserId)
    .maybeSingle();
  if (error) {
    logger.error({ err: error, lineUserId }, 'getUser failed');
    return null;
  }
  return data as LineUser | null;
}

export async function setMode(
  lineUserId: string,
  mode: UserMode,
): Promise<void> {
  const { error } = await supabase
    .from('line_users')
    .update({
      current_mode: mode,
      mode_changed_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    })
    .eq('line_user_id', lineUserId);
  if (error) throw error;
  logger.info({ lineUserId, mode }, 'user mode changed');
}

export async function touchActive(lineUserId: string): Promise<void> {
  await supabase
    .from('line_users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('line_user_id', lineUserId);
}

export async function setBlocked(
  lineUserId: string,
  blocked: boolean,
): Promise<void> {
  await supabase
    .from('line_users')
    .update({ is_blocked: blocked, current_mode: 'bot' })
    .eq('line_user_id', lineUserId);
}

export async function setMetadata(
  lineUserId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('line_users')
    .update({ metadata })
    .eq('line_user_id', lineUserId);
  if (error) throw error;
}
