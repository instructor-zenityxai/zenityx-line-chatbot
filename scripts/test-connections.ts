/**
 * Smoke test: verify ทุก external connection
 * - Supabase: INSERT + SELECT + DELETE
 * - Anthropic: ส่ง prompt ทดสอบ
 */
import { supabase } from '../src/integrations/supabase/client.js';
import { anthropic, ANTHROPIC_MODEL } from '../src/integrations/anthropic/client.js';

async function testSupabase(): Promise<boolean> {
  console.log('🗄  Test 1: Supabase connection...');
  const testUserId = `__smoke_test_${Date.now()}__`;

  try {
    const { error: insertError } = await supabase.from('line_users').insert({
      line_user_id: testUserId,
      display_name: 'smoke test',
      current_mode: 'bot',
    });
    if (insertError) {
      console.error('  ❌ INSERT failed:', insertError.message);
      return false;
    }

    const { data, error: selectError } = await supabase
      .from('line_users')
      .select('line_user_id, current_mode')
      .eq('line_user_id', testUserId)
      .single();
    if (selectError || !data) {
      console.error('  ❌ SELECT failed:', selectError?.message);
      return false;
    }

    const { error: deleteError } = await supabase
      .from('line_users')
      .delete()
      .eq('line_user_id', testUserId);
    if (deleteError) {
      console.error('  ⚠ DELETE failed (cleanup):', deleteError.message);
    }

    console.log('  ✅ Supabase OK (INSERT/SELECT/DELETE)');
    return true;
  } catch (err) {
    console.error('  ❌ Supabase error:', err);
    return false;
  }
}

async function testAnthropic(): Promise<boolean> {
  console.log(`🤖 Test 2: Anthropic (${ANTHROPIC_MODEL})...`);
  try {
    const start = Date.now();
    const res = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 50,
      messages: [
        { role: 'user', content: 'ตอบคำเดียวว่า "พร้อม"' },
      ],
    });
    const text = res.content
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('');
    const ms = Date.now() - start;
    console.log(`  ✅ Anthropic OK (${ms}ms)`);
    console.log(`     model: ${res.model}`);
    console.log(`     reply: "${text.trim()}"`);
    console.log(`     tokens: in=${res.usage.input_tokens} out=${res.usage.output_tokens}`);
    return true;
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    console.error(`  ❌ Anthropic error (${e.status ?? '?'}): ${e.message ?? err}`);
    if (e.status === 401) console.error('     → API key ผิด หรือ key ถูก revoke');
    if (e.status === 429) console.error('     → Credit หมด topup ที่ console.anthropic.com/settings/billing');
    return false;
  }
}

async function main(): Promise<void> {
  console.log('=== Connection smoke test ===\n');
  const sb = await testSupabase();
  console.log('');
  const ai = await testAnthropic();
  console.log('');
  if (sb && ai) {
    console.log('🎉 ทุก connection พร้อม — รัน `npm run dev` ได้เลย');
    process.exit(0);
  } else {
    console.log('⚠ มี connection ที่ fail — แก้ก่อนรัน server');
    process.exit(1);
  }
}

main();
