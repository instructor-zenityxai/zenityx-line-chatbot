import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { CoursesData } from '../../types/domain.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

let cachedPrompt: string | null = null;

export function getSystemPrompt(): string {
  if (cachedPrompt) return cachedPrompt;

  const promptBase = readFileSync(
    resolve(repoRoot, 'content/system-prompt.md'),
    'utf-8',
  );
  const coursesJson = readFileSync(
    resolve(repoRoot, 'content/courses.json'),
    'utf-8',
  );
  const courses = JSON.parse(coursesJson) as CoursesData;

  const knowledgeBlock = formatKnowledge(courses);

  cachedPrompt = `${promptBase}\n\n---\n\n# Course Knowledge (รายละเอียดเต็ม)\n\n${knowledgeBlock}`;
  return cachedPrompt;
}

function formatKnowledge(data: CoursesData): string {
  const parts: string[] = [];

  parts.push(`## ${data.company.brand}`);
  parts.push(`Tagline: ${data.company.tagline}`);
  parts.push(`เว็บไซต์: ${data.company.website}`);
  parts.push(`โทร: ${data.company.phone}`);
  parts.push(`อีเมล: ${data.company.email}`);
  parts.push(`ที่อยู่: ${data.company.address}`);
  parts.push('');

  parts.push(`## คอร์สทั้งหมด (${data.courses.length} คอร์ส)`);
  parts.push('');
  for (const c of data.courses) {
    parts.push(`### ${c.title}`);
    parts.push(`- Tagline: ${c.tagline}`);
    parts.push(`- รายละเอียด: ${c.shortDescription}`);
    if (c.duration) parts.push(`- ระยะเวลา: ${c.duration}`);
    if (c.price) parts.push(`- ราคา: ${c.price}`);
    if (c.format) parts.push(`- รูปแบบ: ${c.format}`);
    if (c.location) parts.push(`- สถานที่: ${c.location}`);
    if (c.targetAudience?.length) {
      parts.push(`- เหมาะกับ: ${c.targetAudience.join(' / ')}`);
    }
    if (c.whatYouGet?.length) {
      parts.push(`- สิ่งที่จะได้: ${c.whatYouGet.join(' / ')}`);
    }
    if (c.prerequisite) parts.push(`- พื้นฐานก่อนเรียน: ${c.prerequisite}`);
    parts.push(`- URL: ${c.url}`);
    parts.push('');
  }

  parts.push('## In-House Training');
  parts.push(data.inHouseTraining.description);
  parts.push(`ติดต่อ: ${data.inHouseTraining.contact}`);

  return parts.join('\n');
}

// Force reload (สำหรับ test/dev)
export function clearPromptCache(): void {
  cachedPrompt = null;
}
