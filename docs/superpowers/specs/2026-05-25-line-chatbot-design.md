# LINE Chatbot สำหรับ ZenityX Studio — Design Doc

**วันที่:** 2026-05-25
**Status:** Approved, in implementation
**Author:** Co-designed with Zenityx instructor via Claude Code

---

## 1. ภาพรวม

LINE Official Account chatbot สำหรับสถาบันสอน AI **ZENITYX** เพื่อตอบคำถามลูกค้าอัตโนมัติ, แนะนำคอร์ส, เก็บ lead, และส่งต่อให้ทีมขาย/แอดมิน

### Goals
1. ตอบคำถามลูกค้าอัตโนมัติ (Bot mode + AI mode สลับกันได้)
2. แนะนำ 7 คอร์สของ ZENITYX
3. เก็บ lead (ชื่อ/เบอร์/อีเมล/ความสนใจ)
4. ส่ง lead ต่อให้ทีม (LINE Group + Email)
5. Handoff ไปคุยกับแอดมินผ่าน LINE OA Manager

### Non-goals (Phase 2+)
- Custom admin dashboard (ตอนนี้ใช้ LINE OA Manager)
- Booking integration (Google Calendar/Cal.com)
- RAG + Vector DB (ตอนนี้ static JSON พอ)
- Broadcast/campaign push messages
- Multi-channel (FB/IG/Web chat)

---

## 2. Stack

| ชั้น | เลือก | เหตุผล |
|---|---|---|
| Runtime | Node.js 20 LTS | LINE SDK first-class |
| Language | TypeScript 5.x | Type safety |
| Server | Express 4.x | LINE docs ใช้ Express |
| LLM | Claude `claude-sonnet-4-6` ผ่าน Anthropic API | คุณภาพ/ราคาดี, ภาษาไทยแม่น |
| DB | Supabase (Postgres) | DB+Auth+Realtime+ free tier |
| Hosting | Railway | Long-running server, ราคาเริ่ม $5/mo |
| Email | Resend | Lead notification |
| Logging | Pino | Structured logs, fast |
| Validation | Zod | Env + payload |

---

## 3. Architecture (Approach A — Single Long-running Server)

```
LINE Platform
      │ webhook
      ▼
Express Server (Railway)
      │
   ┌──┴────────────────────────────────┐
   │ HTTP Routes (webhook, health)     │
   │   ↓                                │
   │ Conversation Router (mode check)  │
   │   ↓                                │
   │ ┌──BotEngine──┐  ┌──AIEngine──┐   │
   │ │keyword/menu │  │Claude+history│   │
   │ └─────────────┘  └─────────────┘   │
   │   ↓                                │
   │ Integrations: LINE/Anthropic/      │
   │               Supabase/Resend      │
   └────────────────────────────────────┘
      │                ▲              ▲
      ▼                │              │
   Supabase         Resend       LINE Group
                                 (notify)
```

---

## 4. Data Model (Supabase Schema)

### Tables (Phase 1)

#### `line_users` — user profile + current mode
- `id` (uuid PK), `line_user_id` (unique), `display_name`, `picture_url`
- `current_mode` enum('bot','ai','human') default 'bot' ← หัวใจของระบบ
- `mode_changed_at`, `first_followed_at`, `last_active_at`, `is_blocked`
- `metadata` jsonb (เก็บ custom fields)

#### `messages` — chat history (text/flex/postback เท่านั้น)
- `id`, `line_user_id` FK, `direction`(in/out), `source`(user/bot/ai/admin/system)
- `message_type` IN ('text','flex','postback') — ตัด image/sticker ทิ้ง
- `content` jsonb, `line_message_id`, `created_at`

#### `leads` — form data + CRM
- `id`, `line_user_id` FK, `name`, `phone`, `email`, `interest`
- `source` ('line_form'/'manual'/'imported'), `status`, `notes`, `notified_at`

#### `events_log` — webhook raw events (debug)
- `id`, `event_type`, `line_user_id`, `payload` jsonb, `processed`, `error`

### Phase 2 tables (เผื่อในอนาคต)
- `conversations` (split AI session chunks)
- `mode_history` (ทุก mode change)
- `bookings`, `broadcasts`, `rate_limits`

### RLS
- Phase 1: ปิดทุก table (server access ผ่าน service role)
- Phase 2: เปิดเมื่อมี admin dashboard

---

## 5. Conversation Flow & Mode Logic

### 3 Modes
- `bot` (default) — rule-based + menu/flex
- `ai` — Claude API + history context
- `human` — bot ไม่ตอบ, admin handle ผ่าน LINE OA Manager

### Mode Transitions

| From | To | Trigger |
|---|---|---|
| (new) | bot | event `follow` (add friend) |
| bot | ai | postback `mode=ai` |
| bot | human | postback `mode=human` (notify admin group) |
| ai | bot | postback `mode=bot` หรือ keyword "เมนู"/"กลับ" |
| human | bot | user keyword "เมนู"/"กลับ" (admin end-handoff = Phase 2) |
| any | bot | event `unfollow` (auto reset) |

### **ไม่มี Timeout** — AI mode อยู่จนกว่า user สลับเอง

### Special Keywords (ทุก mode)
- `เมนู` / `menu` / `/menu` / `/start` / `กลับ` → mode=bot + main menu
- `#admin` / `แอดมิน` / `คุยกับคน` → mode=human + notify admin

### Webhook Event Routing
- `follow` → upsert user + welcome flex + record
- `unfollow` → mark is_blocked + reset mode
- `message` (text only) → router → engine
- `postback` → switch case (mode/course/lead_form/lead_submit)
- `join/leave` (group) → log group_id

---

## 6. Folder Structure

```
src/
├── index.ts              entry
├── app.ts                Express setup
├── config/{env,constants}
├── routes/{webhook,health}
├── services/{conversation-router,bot-engine,ai-engine,
│            lead-service,user-service,knowledge-service}
├── integrations/
│   ├── line/{client,verify,replies}
│   ├── anthropic/{client,prompt}
│   ├── supabase/{client,types}
│   └── email/{client}
├── flex/{welcome,main-menu,course-list,course-detail,lead-form,mode-switch}
├── lib/{logger,errors,handlers/}
└── types/
content/
├── courses.json          7 คอร์ส (knowledge base)
├── system-prompt.md      AI persona
└── faq.json              keyword-based replies
scripts/
├── sync-knowledge.ts
├── deploy-richmenu.ts    (รอ image จาก user)
└── seed-db.ts
supabase/migrations/0001_init.sql
```

---

## 7. Lead Pipeline

```
User กดเมนู "📝 ติดต่อ/สมัครเรียน"
  → reply Lead Form (flex with input quick replies)
  → User กรอกชื่อ → เบอร์ → อีเมล → คอร์สที่สนใจ
  → submit → INSERT leads (status='new')
  → push LINE Group (alert + ปุ่ม "ตอบรับ")
  → send Email (Resend) → admin@zenityxai.com
  → UPDATE leads SET notified_at=now()
  → reply user "ขอบคุณครับ ทีมงานจะติดต่อกลับใน 24 ชม"
```

Lead capture state ใช้ `line_users.metadata.lead_draft` jsonb เก็บ step-by-step

---

## 8. Security

- `.env` (gitignored) — LINE/Anthropic/Supabase/Resend secrets
- Webhook signature verification ทุก request (`x-line-signature` HMAC-SHA256 with `CHANNEL_SECRET`)
- Supabase access ผ่าน `SERVICE_ROLE_KEY` (server only, ไม่ exposed ไป client)
- Rate limit: ตอนนี้ trust LINE rate limit, future: add per-user limit
- PII: phone/email ใน leads → consider encryption at rest (Phase 2)

---

## 9. Deployment

### Local dev
```bash
npm install
cp .env.example .env  # ใส่ keys
npm run dev           # tsx watch src/index.ts
# ใช้ ngrok หรือ cloudflared expose localhost:3000 → ตั้ง LINE webhook
```

### Production (Railway)
```bash
git push origin main
# Railway auto-deploy
# Set env vars ใน Railway dashboard
# Railway gives URL → ใส่ที่ LINE Developers Console webhook URL
```

### Rich Menu Deploy
```bash
# วาง image ใน assets/richmenu/main.png (2500x1686)
npm run deploy:richmenu
# script จะ: create richmenu → upload image → bind default
```

---

## 10. Open Questions / Phase 2

- [ ] Rich Menu image (user จะ generate มาให้)
- [ ] Privacy policy / Terms of use URLs สำหรับเพิ่มใน LINE OA
- [ ] LINE Group ID ของทีม (เอามาตอน invite bot เข้า group ครั้งแรก)
- [ ] Custom domain สำหรับ Railway URL
- [ ] Verified Account badge (LINE)
- [ ] Admin end-handoff UI (Option B)

---

## Approved Decisions Summary

✅ Stack: Node+TS+Express+Supabase+Railway+Anthropic+Resend
✅ Architecture: Approach A (single long-running server)
✅ 4 tables MVP, RLS off Phase 1
✅ 3 modes: bot/ai/human, ไม่มี timeout
✅ messages เก็บแค่ text/flex/postback
✅ Knowledge: content/courses.json static
✅ Admin handoff: LINE OA Manager (no custom dashboard)
✅ Lead delivery: LINE Group + Resend Email
