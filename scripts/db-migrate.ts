/**
 * รัน migration ลง Supabase
 *
 * ปกติเราใช้ Supabase Studio (SQL Editor) วาง SQL จาก supabase/migrations/0001_init.sql
 * script นี้เป็น helper สำหรับรันผ่าน CLI ถ้าตั้ง connection string ไว้
 *
 * Pre-req:
 *   - มี DATABASE_URL ใน .env (จาก Supabase project settings → Database → Connection string)
 *   - npm i -g supabase หรือใช้ psql
 *
 * วิธีใช้ที่ "ง่ายและแนะนำ":
 *   1. เปิด Supabase Studio → SQL Editor
 *   2. เปิดไฟล์ supabase/migrations/0001_init.sql แล้ว copy ทั้งหมด
 *   3. วางใน SQL Editor → Run
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATIONS_DIR = resolve(process.cwd(), 'supabase/migrations');

function main(): void {
  console.log('📋 Migration files:');
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const path = resolve(MIGRATIONS_DIR, file);
    const content = readFileSync(path, 'utf-8');
    const lines = content.split('\n').length;
    const tables = [...content.matchAll(/CREATE TABLE.*?(\w+)\s*\(/gi)].map((m) => m[1]);
    console.log(`\n📄 ${file}`);
    console.log(`   Lines: ${lines}`);
    console.log(`   Tables: ${tables.join(', ')}`);
  }

  console.log('\n💡 วิธีรัน migration:');
  console.log('   1. เปิด https://supabase.com/dashboard/project/<your-project>/sql/new');
  console.log('   2. Copy content จาก supabase/migrations/0001_init.sql');
  console.log('   3. Paste แล้วกด Run');
  console.log('\n   (Phase 2: ใช้ supabase CLI หรือ pg-migrate ทำ automation)');
}

main();
