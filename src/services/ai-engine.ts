import { anthropic, ANTHROPIC_MODEL, ANTHROPIC_MAX_TOKENS } from '../integrations/anthropic/client.js';
import { getSystemPrompt } from '../integrations/anthropic/prompt.js';
import { supabase } from '../integrations/supabase/client.js';
import { AI_HISTORY_LIMIT } from '../config/constants.js';
import { logger } from '../lib/logger.js';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function aiReply(
  lineUserId: string,
  userText: string,
): Promise<string> {
  const history = await loadHistory(lineUserId);

  const messages: ClaudeMessage[] = [
    ...history,
    { role: 'user', content: userText },
  ];

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: getSystemPrompt(),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    const text = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('\n')
      .trim();

    if (!text) {
      logger.warn({ lineUserId }, 'AI returned empty response');
      return 'ขออภัยครับ ผมยังตอบไม่ได้ตอนนี้ ลองถามใหม่อีกครั้ง หรือพิมพ์ "เมนู" กลับเมนูหลักครับ';
    }

    logger.info(
      {
        lineUserId,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheRead: response.usage.cache_read_input_tokens ?? 0,
        cacheCreate: response.usage.cache_creation_input_tokens ?? 0,
      },
      'AI reply',
    );

    return text;
  } catch (err) {
    logger.error({ err, lineUserId }, 'Anthropic API failed');
    return 'ขออภัยครับ ระบบ AI ขัดข้องชั่วคราว ลองใหม่อีกครั้ง หรือพิมพ์ "เมนู" กลับเมนูหลัก หรือ "คุยกับแอดมิน" เพื่อให้ทีมช่วยครับ';
  }
}

async function loadHistory(lineUserId: string): Promise<ClaudeMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('direction, source, message_type, content, created_at')
    .eq('line_user_id', lineUserId)
    .in('source', ['user', 'ai'])
    .eq('message_type', 'text')
    .order('created_at', { ascending: false })
    .limit(AI_HISTORY_LIMIT);

  if (error) {
    logger.warn({ err: error, lineUserId }, 'loadHistory failed — continuing without context');
    return [];
  }

  // เก่า → ใหม่
  const ordered = (data ?? []).reverse();
  return ordered
    .map((row): ClaudeMessage | null => {
      const text = extractText(row.content);
      if (!text) return null;
      return {
        role: row.source === 'ai' ? 'assistant' : 'user',
        content: text,
      };
    })
    .filter((m): m is ClaudeMessage => m !== null);
}

function extractText(content: unknown): string | null {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object' && 'text' in content) {
    const t = (content as { text: unknown }).text;
    return typeof t === 'string' ? t : null;
  }
  return null;
}
