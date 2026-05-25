/**
 * Scrape og:image จากหน้าคอร์สของ zenityxai.com แล้ว update courses.json
 *
 * รัน: npx tsx scripts/scrape-course-images.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Course {
  id: string;
  title: string;
  url: string;
  coverImage?: string;
  [key: string]: unknown;
}

interface CoursesData {
  courses: Course[];
  [key: string]: unknown;
}

const COURSES_JSON = resolve(process.cwd(), 'content/courses.json');

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; zenityx-bot/0.1)' },
    });
    if (!res.ok) {
      console.warn(`  ✗ ${url} → HTTP ${res.status}`);
      return null;
    }
    const html = await res.text();

    // Match <meta property="og:image" content="...">
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (og) return og[1];

    // Fallback: twitter:image
    const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (tw) return tw[1];

    // Fallback: first Poster-*.webp in HTML
    const poster = html.match(/https:\/\/zenityxai\.com\/wp-content\/uploads\/[^"'\s]+Poster[^"'\s]*\.(webp|jpg|png)/i);
    if (poster) return poster[0];

    return null;
  } catch (err) {
    console.warn(`  ✗ ${url} → ${(err as Error).message}`);
    return null;
  }
}

async function main(): Promise<void> {
  const raw = readFileSync(COURSES_JSON, 'utf-8');
  const data = JSON.parse(raw) as CoursesData;

  console.log(`📋 Found ${data.courses.length} courses — scraping og:image...\n`);

  let updated = 0;
  for (const course of data.courses) {
    const existing = course.coverImage;
    const isPlaceholder =
      !existing || existing.includes('Poster-AI-Content-Workshop'); // default fallback

    if (!isPlaceholder) {
      console.log(`  ⏭  ${course.title.padEnd(40)} (already has image)`);
      continue;
    }

    process.stdout.write(`  → ${course.title.padEnd(40)} ... `);
    const img = await fetchOgImage(course.url);
    if (img) {
      course.coverImage = img;
      updated++;
      console.log(`✓`);
      console.log(`     ${img}`);
    } else {
      console.log(`✗ (no image found)`);
    }
    // เบรค ~200ms กัน rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  if (updated > 0) {
    // Preserve $schema/lastUpdated/etc.
    (data as { lastUpdated: string }).lastUpdated = new Date().toISOString().slice(0, 10);
    writeFileSync(COURSES_JSON, JSON.stringify(data, null, 2) + '\n');
    console.log(`\n✅ Updated ${updated} courses in courses.json`);
  } else {
    console.log(`\n⚠ No updates`);
  }
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
