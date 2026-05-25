/**
 * Generate basic rich menu PNG (2500x1686) → assets/richmenu/main.png
 *
 * Layout 3 columns x 2 rows:
 *   [คอร์ส       ][ถาม AI       ][สมัครเรียน    ]
 *   [คุยกับแอดมิน ][ติดต่อ        ][เว็บไซต์      ]
 *
 * รัน: npx tsx scripts/gen-richmenu-image.ts
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import sharp from 'sharp';

const W = 2500;
const H = 1686;
const COLS = 3;
const ROWS = 2;
const CW = W / COLS;
const CH = H / ROWS;

interface Cell {
  icon: string;       // emoji or short text
  label: string;      // Thai label
  sub?: string;       // English subtitle
  bg: string;         // background color
}

const cells: Cell[] = [
  // Row 1
  { icon: '📚', label: 'ดูคอร์สทั้งหมด',  sub: 'Courses',     bg: '#10b981' },
  { icon: '🤖', label: 'ถาม AI',         sub: 'Ask AI',      bg: '#059669' },
  { icon: '📝', label: 'สมัครเรียน',      sub: 'Apply',       bg: '#10b981' },
  // Row 2
  { icon: '👤', label: 'คุยกับแอดมิน',    sub: 'Admin',       bg: '#0e7e60' },
  { icon: '📞', label: 'ติดต่อ',          sub: 'Contact',     bg: '#10b981' },
  { icon: '🌐', label: 'เว็บไซต์',         sub: 'Website',     bg: '#0e7e60' },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cellSvg(cell: Cell, col: number, row: number): string {
  const x = col * CW;
  const y = row * CH;
  const cx = x + CW / 2;
  const cy = y + CH / 2;

  return `
    <rect x="${x}" y="${y}" width="${CW}" height="${CH}" fill="${cell.bg}" />
    <rect x="${x + 4}" y="${y + 4}" width="${CW - 8}" height="${CH - 8}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
    <text x="${cx}" y="${cy - 80}" font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif" font-size="200" text-anchor="middle" dominant-baseline="central">${cell.icon}</text>
    <text x="${cx}" y="${cy + 80}" font-family="Segoe UI, Tahoma, sans-serif" font-size="72" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(cell.label)}</text>
    ${cell.sub ? `<text x="${cx}" y="${cy + 160}" font-family="Segoe UI, sans-serif" font-size="42" fill="rgba(255,255,255,0.7)" text-anchor="middle">${escapeXml(cell.sub)}</text>` : ''}
  `;
}

function buildSvg(): string {
  const cellsXml = cells.map((c, i) => cellSvg(c, i % COLS, Math.floor(i / COLS))).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- background -->
  <rect width="${W}" height="${H}" fill="#0f3a2e" />

  ${cellsXml}

  <!-- ZENITYX branding bottom-left tiny -->
  <text x="40" y="${H - 24}" font-family="Segoe UI, sans-serif" font-size="28" fill="rgba(255,255,255,0.3)">ZENITYX</text>
</svg>`;
}

async function main(): Promise<void> {
  const svg = buildSvg();
  const outPath = resolve(process.cwd(), 'assets/richmenu/main.png');

  mkdirSync(dirname(outPath), { recursive: true });

  const buf = await sharp(Buffer.from(svg))
    .resize(W, H)
    .png({ compressionLevel: 9, quality: 95 })
    .toBuffer();

  writeFileSync(outPath, buf);
  const sizeKB = (buf.length / 1024).toFixed(1);

  console.log(`✅ Rich menu image generated:`);
  console.log(`   path: ${outPath}`);
  console.log(`   size: ${sizeKB} KB`);
  console.log(`   dims: ${W}x${H}`);

  if (buf.length > 1024 * 1024) {
    console.warn(`⚠ File > 1 MB — LINE จะ reject (limit 1 MB)`);
  }

  console.log('');
  console.log('ขั้นต่อไป: npm run deploy:richmenu');
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
