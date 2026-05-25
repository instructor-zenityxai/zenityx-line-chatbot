# ZenityX LINE Chatbot

LINE Official Account chatbot สำหรับ **ZENITYX** (zenityxai.com)
สถาบันสอน AI ในกรุงเทพ — Bot rule-based + AI mode (Claude) + handoff ไปแอดมิน

---

## คุณสมบัติ

- **Bot mode** — ตอบ keyword/menu/flex สำหรับคำถามทั่วไป
- **AI mode** — Claude Sonnet 4.6 ตอบเชิงลึก ดึง context จาก 10 ข้อความล่าสุด + knowledge จาก courses.json
- **3 modes ต่อ user** — `bot` / `ai` / `human` (handoff ผ่าน LINE OA Manager)
- **Rich Menu** — 6 ปุ่ม (คอร์ส / AI / สมัคร / แอดมิน / ติดต่อ / เว็บ)
- **Flex Cards** — Welcome + Main Menu + 7 Course Cards + Course Detail + Lead Form
- **Lead capture** — multi-step form → Supabase + LINE Group push + Email (Resend)
- **Special keywords** — `เมนู` / `แอดมิน` ทำงานทุก mode

---

## Tech Stack

| ชั้น | เทค |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 4 + TypeScript |
| LINE | `@line/bot-sdk` v9 |
| LLM | Claude Sonnet 4.6 ผ่าน `@anthropic-ai/sdk` |
| DB | Supabase (Postgres) |
| Email | Resend |
| Hosting | Railway |
| Logging | Pino |

---

## โครงสร้างโปรเจกต์

```
src/
├── index.ts                  # entry
├── app.ts                    # express setup
├── config/{env,constants}    # env validation + constants
├── routes/{webhook,health}   # HTTP routes
├── services/                 # business logic
│   ├── conversation-router   # ดู mode → ส่งไป engine
│   ├── bot-engine            # rule-based keyword/menu
│   ├── ai-engine             # Claude call + history
│   ├── lead-service          # capture + notify
│   ├── user-service          # mode/profile CRUD
│   ├── knowledge-service     # อ่าน courses.json
│   └── message-store         # save messages + events_log
├── integrations/             # external API clients
│   ├── line/{client,verify,replies}
│   ├── anthropic/{client,prompt}
│   ├── supabase/{client,types}
│   └── email/{client}
├── flex/                     # Flex Message templates
│   ├── welcome, main-menu
│   ├── course-list, course-detail
│   ├── lead-form, mode-switch
├── lib/{logger,errors,handlers/}
└── types/

content/
├── courses.json              # 7 คอร์ส + บริษัท info
├── system-prompt.md          # AI persona
└── faq.json                  # keyword-based replies

scripts/
├── deploy-richmenu.ts        # upload rich menu image
├── db-migrate.ts             # migration info
└── sync-knowledge.ts         # verify courses load

supabase/migrations/0001_init.sql
```

---

## Setup (ครั้งแรก)

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า `.env`

Copy `.env.example` → `.env` แล้วเติมค่า:

```env
# LINE — จาก Developers Console
LINE_CHANNEL_ID=xxxxxxxxxx
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LINE_CHANNEL_ACCESS_TOKEN=eyJhbGc...        # long-lived token
LINE_OA_BASIC_ID=@799iqrzy
LINE_ADMIN_GROUP_ID=                          # ใส่ตอน invite bot เข้า group

# Anthropic — จาก console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_MAX_TOKENS=1024

# Supabase — จาก Project Settings → API
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Resend — จาก resend.com/api-keys
RESEND_API_KEY=re_...
LEAD_NOTIFY_EMAIL=admin@zenityxai.com
LEAD_FROM_EMAIL=noreply@zenityxai.com       # ต้อง verify domain ใน Resend ก่อน

# App
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

### 3. สร้าง Supabase Project + รัน Migration

1. ไป https://supabase.com → New Project (เลือก region สิงคโปร์)
2. Project Settings → API → copy `URL` + `service_role` key → ใส่ `.env`
3. SQL Editor → New query → paste `supabase/migrations/0001_init.sql` → Run
4. ตรวจ Table Editor → ต้องเห็น 4 tables: `line_users`, `messages`, `leads`, `events_log`

### 4. รัน Local

```bash
npm run dev
# Server: http://localhost:3000
# Health: http://localhost:3000/health
```

### 5. Expose Local ออก Internet (ให้ LINE ส่ง webhook ได้)

ใช้ ngrok หรือ cloudflared:

```bash
# Option A: ngrok
ngrok http 3000
# จะได้ URL เช่น https://abc-123.ngrok-free.app

# Option B: cloudflared
cloudflared tunnel --url http://localhost:3000
```

### 6. ตั้ง Webhook URL ใน LINE Developers Console

- ไป Channel → Messaging API tab → Webhook URL
- ใส่: `https://abc-123.ngrok-free.app/webhook`
- กด **Verify** → ต้องขึ้น "Success"
- เปิด **Use webhook = ON**

### 7. ทดสอบ

- Add friend OA ผ่าน LINE app → ควรได้ Welcome flex
- พิมพ์ "เมนู" → ควรได้ Main Menu
- กดปุ่ม "📚 ดูคอร์สทั้งหมด" → ควรได้ Carousel 7 คอร์ส
- กด "🤖 ถาม AI" → ลองพิมพ์ "Bot Vibe เรียนอะไรบ้าง"

---

## Deploy Production (Railway)

### 1. Push code ขึ้น Git repo

```bash
git init
git add .
git commit -m "feat: initial setup"
git remote add origin https://github.com/your-username/zenityx-line-chatbot.git
git push -u origin main
```

### 2. สร้าง Railway project

1. ไป https://railway.app → New Project → Deploy from GitHub repo
2. เลือก repo นี้
3. Railway จะ auto-detect Node.js → install + build + start

### 3. ตั้ง Environment Variables

Railway dashboard → Variables tab → เพิ่มทุก key จาก `.env`

### 4. ได้ Public URL

Railway จะให้ URL เช่น `zenityx-line-chatbot-production.up.railway.app`

### 5. แก้ Webhook URL ใน LINE Developers Console

เปลี่ยนจาก ngrok URL → Railway URL: `https://zenityx-line-chatbot-production.up.railway.app/webhook`

### 6. Health check

```bash
curl https://zenityx-line-chatbot-production.up.railway.app/health
# → {"ok":true,"service":"zenityx-line-chatbot",...}
```

---

## Rich Menu (รอภาพจาก user)

### 1. เตรียมภาพ

- ขนาด: **2500 x 1686 px** (PNG)
- ขนาดไฟล์: **≤ 1 MB**
- Layout: 3 columns x 2 rows = 6 ปุ่ม
  ```
  ┌──────────┬──────────┬──────────┐
  │ คอร์ส     │ ถาม AI    │ สมัครเรียน │
  ├──────────┼──────────┼──────────┤
  │ คุยแอดมิน │ ติดต่อ    │ เว็บไซต์    │
  └──────────┴──────────┴──────────┘
  ```

### 2. วางที่ `assets/richmenu/main.png`

### 3. Deploy

```bash
npm run deploy:richmenu
```

Script จะ:
1. สร้าง rich menu structure (areas + actions)
2. Upload image
3. Set เป็น default (ทุกคนที่ follow OA จะเห็น)

> ⚠️ ถ้า layout ไม่ใช่ 3x2 ต้องแก้ `AREAS` ใน `scripts/deploy-richmenu.ts` ให้ตรง

---

## เพิ่ม LINE Admin Group

ตอน lead เข้ามาใหม่ ระบบจะ push alert ไป group ที่ตั้งใน `LINE_ADMIN_GROUP_ID`

### วิธีหา group ID:

1. สร้าง LINE Group สำหรับทีม
2. เปิด `Allow bot to join group chats` ใน Developers Console (Messaging API tab)
3. Invite bot **@799iqrzy** เข้า group
4. ดู log ของ server — จะเห็น:
   ```
   [info] group event — copy this ID to LINE_ADMIN_GROUP_ID  groupId=C123abc...
   ```
5. ใส่ค่าที่ได้ใน `.env` → `LINE_ADMIN_GROUP_ID=C123abc...`
6. Restart server (หรือ redeploy)

---

## Scripts ที่ใช้ได้

```bash
npm run dev               # dev mode + watch
npm run build             # compile → dist/
npm run start             # run production build
npm run typecheck         # tsc --noEmit
npm run deploy:richmenu   # upload rich menu image
npm run sync:knowledge    # verify courses.json + system prompt
npm run db:migrate        # show migration info
```

---

## Update Knowledge (เพิ่ม/แก้ข้อมูลคอร์ส)

1. เปิด `content/courses.json`
2. แก้/เพิ่ม course object
3. ถ้าอยากเพิ่ม keyword rule ใหม่ — แก้ `content/faq.json`
4. Commit + push → Railway auto-redeploy
5. ระบบจะโหลด knowledge ใหม่ตอน startup

---

## Special Keywords (ทำงานทุก mode)

| Keyword | ผล |
|---|---|
| `เมนู` / `menu` / `กลับ` / `/start` | กลับเมนูหลัก (mode=bot) |
| `แอดมิน` / `#admin` / `คุยกับคน` | เปลี่ยนเป็น human mode + alert ทีม |

---

## Troubleshooting

### Bot ไม่ตอบ
1. Check `/health` ทำงานไหม
2. Check Webhook URL ใน LINE Console ตรงไหม
3. Check `Use webhook = ON`
4. Check Auto-reply messages = OFF (ใน Manager)
5. ดู log ที่ Railway → Deploy logs

### Signature verification failed
- ตรวจ `LINE_CHANNEL_SECRET` ใน `.env` ตรงกับ Console
- ตรวจ Express middleware รัน `verify` callback ของ `express.json` ถูกต้อง

### AI mode ตอบช้า
- Normal: Claude ตอบใน 2-5 วินาที
- ถ้าเกิน 10 วินาที — ดู log `inputTokens` `cacheRead` — ถ้า cache_read = 0 แปลว่า prompt caching ไม่ทำงาน (cache miss)
- cache อายุ 5 นาที — ถ้า user เงียบนานกว่านี้ ใช้ cache ไม่ได้

### Lead form ค้าง
- User พิมพ์ "ยกเลิก" หรือ "เมนู" → reset state
- ดูใน Supabase: `select metadata from line_users where line_user_id = '...'`

---

## Phase 2 Roadmap

- [ ] Rich Menu image จริง (รอ user สร้าง)
- [ ] Privacy Policy + Terms of Use pages (PDPA)
- [ ] Custom admin web dashboard (แทน LINE OA Manager)
- [ ] Booking integration (Cal.com / Google Calendar)
- [ ] RAG + Vector DB สำหรับ knowledge ที่ใหญ่ขึ้น
- [ ] Broadcast/campaign push messages
- [ ] Analytics dashboard (ใช้ events_log)
- [ ] Multi-channel (FB / IG / Web chat)
- [ ] LINE Pay integration
- [ ] Premium ID (`@zenityx`)

---

## License

Private — All rights reserved © 2026 ZENITYX
