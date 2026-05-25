/**
 * Optimize user's rich menu image:
 *   1. Read source image (any common format)
 *   2. Resize to exact 2500x1686 px (LINE Rich Menu standard)
 *   3. Compress to ≤ 1 MB (LINE limit)
 *   4. Save as assets/richmenu/main.png
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const TARGET_W = 2500;
const TARGET_H = 1686;
const MAX_BYTES = 1024 * 1024; // 1 MB

async function main(): Promise<void> {
  const dir = resolve(process.cwd(), 'assets/richmenu');
  const files = readdirSync(dir)
    .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f) && f !== 'main.png')
    .map((f) => ({ name: f, path: resolve(dir, f), mtime: statSync(resolve(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime); // newest first

  if (files.length === 0) {
    console.error('❌ ไม่พบไฟล์ใหม่ใน assets/richmenu/ (นอกจาก main.png)');
    process.exit(1);
  }

  const src = files[0];
  console.log(`📷 Source: ${src.name}`);

  const buf = readFileSync(src.path);
  const meta = await sharp(buf).metadata();
  console.log(`   Original: ${meta.width}x${meta.height} (${(buf.length / 1024).toFixed(1)} KB)`);

  // Try compression quality 90 → 70 จน ≤ 1 MB
  let outBuf: Buffer | null = null;
  for (const quality of [90, 80, 70, 60]) {
    outBuf = await sharp(buf)
      .resize(TARGET_W, TARGET_H, { fit: 'cover', position: 'center' })
      .png({ compressionLevel: 9, quality, palette: true })
      .toBuffer();
    if (outBuf.length <= MAX_BYTES) {
      console.log(`   PNG quality=${quality} → ${(outBuf.length / 1024).toFixed(1)} KB ✓`);
      break;
    }
    console.log(`   PNG quality=${quality} → ${(outBuf.length / 1024).toFixed(1)} KB (too big, try lower)`);
  }

  // Last resort: JPEG (LINE accepts JPEG for rich menu)
  if (!outBuf || outBuf.length > MAX_BYTES) {
    outBuf = await sharp(buf)
      .resize(TARGET_W, TARGET_H, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    console.log(`   JPEG quality=85 → ${(outBuf.length / 1024).toFixed(1)} KB (used as fallback)`);
  }

  const outPath = resolve(dir, 'main.png');
  writeFileSync(outPath, outBuf);

  console.log(`\n✅ Saved → ${outPath}`);
  console.log(`   Final size: ${(outBuf.length / 1024).toFixed(1)} KB`);
  console.log(`   Dimensions: ${TARGET_W}x${TARGET_H}`);

  // Optional: cleanup source if it was a "Generated image*" file
  if (/^Generated image/i.test(src.name)) {
    unlinkSync(src.path);
    console.log(`🧹 Removed source: ${src.name}`);
  }

  console.log('\nNext: npm run deploy:richmenu');
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
