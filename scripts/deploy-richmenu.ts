/**
 * Deploy Rich Menu ไป LINE OA
 *
 * วิธีใช้:
 *   1. วาง image ที่ assets/richmenu/main.png (2500x1686, ≤ 1 MB)
 *   2. รัน: npm run deploy:richmenu
 *
 * Layout default 6 ปุ่ม 3x2:
 *   ┌──────────┬──────────┬──────────┐
 *   │ คอร์ส     │  ถาม AI   │  สมัครเรียน│
 *   ├──────────┼──────────┼──────────┤
 *   │ คุยกับแอดมิน│ ติดต่อ    │  เว็บไซต์   │
 *   └──────────┴──────────┴──────────┘
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { messagingApi } from '@line/bot-sdk';
import { lineClient } from '../src/integrations/line/client.js';
import { env } from '../src/config/env.js';
import { POSTBACK_ACTIONS } from '../src/config/constants.js';

const IMAGE_PATH = resolve(process.cwd(), 'assets/richmenu/main.png');

const AREAS = [
  // Row 1 (y: 0–843)
  {
    bounds: { x: 0, y: 0, width: 833, height: 843 },
    action: {
      type: 'postback' as const,
      label: 'คอร์ส',
      data: POSTBACK_ACTIONS.COURSE_LIST,
      displayText: 'ดูคอร์สทั้งหมด',
    },
  },
  {
    bounds: { x: 833, y: 0, width: 834, height: 843 },
    action: {
      type: 'postback' as const,
      label: 'ถาม AI',
      data: POSTBACK_ACTIONS.MODE_AI,
      displayText: 'คุยกับ AI',
    },
  },
  {
    bounds: { x: 1667, y: 0, width: 833, height: 843 },
    action: {
      type: 'postback' as const,
      label: 'สมัครเรียน',
      data: POSTBACK_ACTIONS.LEAD_FORM_START,
      displayText: 'สมัครเรียน',
    },
  },
  // Row 2 (y: 843–1686)
  {
    bounds: { x: 0, y: 843, width: 833, height: 843 },
    action: {
      type: 'postback' as const,
      label: 'คุยกับแอดมิน',
      data: POSTBACK_ACTIONS.MODE_HUMAN,
      displayText: 'คุยกับแอดมิน',
    },
  },
  {
    bounds: { x: 833, y: 843, width: 834, height: 843 },
    action: {
      type: 'message' as const,
      label: 'ติดต่อ',
      text: 'ติดต่อ',
    },
  },
  {
    bounds: { x: 1667, y: 843, width: 833, height: 843 },
    action: {
      type: 'uri' as const,
      label: 'เว็บไซต์',
      uri: 'https://zenityxai.com',
    },
  },
];

async function deleteExistingMenus(): Promise<void> {
  const list = await lineClient.getRichMenuList();
  if (list.richmenus.length === 0) return;
  console.log(`🧹 พบ rich menu เดิม ${list.richmenus.length} ตัว — ลบทิ้งก่อน...`);
  for (const m of list.richmenus) {
    try {
      await lineClient.deleteRichMenu(m.richMenuId);
      console.log(`   deleted ${m.richMenuId.slice(0, 12)}...`);
    } catch (err) {
      console.warn(`   warn deleting ${m.richMenuId}: ${(err as Error).message}`);
    }
  }
}

async function main(): Promise<void> {
  console.log('🚀 Deploying rich menu to LINE OA...');
  console.log(`   Channel: ${env.LINE_CHANNEL_ID}`);

  if (!existsSync(IMAGE_PATH)) {
    console.error(`❌ ไม่พบ image ที่: ${IMAGE_PATH}`);
    console.error('   วาง image 2500x1686 PNG ที่นั่น แล้วลองใหม่');
    process.exit(1);
  }

  // 0. Clean ของเดิม
  await deleteExistingMenus();

  // 1. Create structure
  const created = await lineClient.createRichMenu({
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'ZenityX Main Menu',
    chatBarText: 'เมนู ZenityX',
    areas: AREAS,
  });
  const richMenuId = created.richMenuId;
  console.log(`✅ Created rich menu: ${richMenuId}`);

  // 2. Upload image via blob client
  const blobClient = new messagingApi.MessagingApiBlobClient({
    channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
  });
  const imageBuffer = readFileSync(IMAGE_PATH);
  await blobClient.setRichMenuImage(
    richMenuId,
    new Blob([imageBuffer as unknown as ArrayBuffer], { type: 'image/png' }),
  );
  console.log(`✅ Uploaded image (${(imageBuffer.length / 1024).toFixed(1)} KB)`);

  // 3. Set as default
  await lineClient.setDefaultRichMenu(richMenuId);
  console.log(`✅ Set as default rich menu`);

  console.log('');
  console.log('🎉 เสร็จ! เปิด LINE app แล้ว:');
  console.log('   • Block bot แล้ว Add friend ใหม่ (เพื่อ refresh menu) หรือ');
  console.log('   • กดเข้าและออก chat กับ OA');
  console.log('');
  console.log('📋 Rich Menu ID:', richMenuId);
}

main().catch((err) => {
  console.error('❌ Deploy failed:', err);
  process.exit(1);
});
