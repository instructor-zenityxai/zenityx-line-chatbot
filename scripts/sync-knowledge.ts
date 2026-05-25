/**
 * Sync knowledge (courses, FAQ) — clear prompt cache เพื่อให้ AI engine โหลดใหม่
 *
 * เนื่องจาก content/courses.json เป็น file ใน repo การ "sync" คือ:
 *   1. แก้ไข content/courses.json (manual หรือ script scrape เว็บ)
 *   2. commit + push → Railway auto-redeploy → AI engine โหลดใหม่ตอน startup
 *
 * Script นี้ใช้ตอน dev เพื่อ verify ว่า content โหลดได้ และ system prompt format ถูกต้อง
 */

import { loadCourses } from '../src/services/knowledge-service.js';
import { getSystemPrompt, clearPromptCache } from '../src/integrations/anthropic/prompt.js';

function main(): void {
  console.log('📚 Loading knowledge...');
  const data = loadCourses();
  console.log(`✅ Loaded ${data.courses.length} courses`);
  console.log(`   Last updated: ${data.lastUpdated}`);
  console.log(`   Company: ${data.company.brand}`);
  console.log('');

  console.log('📋 Courses:');
  for (const c of data.courses) {
    const flags: string[] = [];
    if (c.price?.includes('TBD')) flags.push('⚠ price TBD');
    if (c.duration?.includes('TBD')) flags.push('⚠ duration TBD');
    console.log(`   • ${c.title} ${flags.join(' ')}`);
  }

  console.log('');
  console.log('🤖 System prompt preview (first 500 chars):');
  clearPromptCache();
  const prompt = getSystemPrompt();
  console.log('---');
  console.log(prompt.slice(0, 500) + '...');
  console.log('---');
  console.log(`Total prompt length: ${prompt.length} chars`);
}

main();
