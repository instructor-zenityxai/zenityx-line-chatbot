import { supabase } from '../integrations/supabase/client.js';
import { logger } from '../lib/logger.js';
import type {
  MessageDirection,
  MessageSource,
  MessageType,
} from '../types/domain.js';

interface SaveMessageInput {
  lineUserId: string;
  direction: MessageDirection;
  source: MessageSource;
  messageType: MessageType;
  content: Record<string, unknown>;
  lineMessageId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function saveMessage(input: SaveMessageInput): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    line_user_id: input.lineUserId,
    direction: input.direction,
    source: input.source,
    message_type: input.messageType,
    content: input.content,
    line_message_id: input.lineMessageId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    // Don't throw — message save failure shouldn't block reply
    logger.warn({ err: error, lineUserId: input.lineUserId }, 'saveMessage failed');
  }
}

export async function logEvent(
  eventType: string,
  payload: unknown,
  lineUserId?: string | null,
  error?: string,
): Promise<void> {
  try {
    await supabase.from('events_log').insert({
      event_type: eventType,
      line_user_id: lineUserId ?? null,
      payload: payload as Record<string, unknown>,
      processed: !error,
      error: error ?? null,
    });
  } catch (err) {
    logger.warn({ err }, 'logEvent failed');
  }
}
