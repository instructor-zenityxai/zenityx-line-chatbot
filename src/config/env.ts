import dotenv from 'dotenv';
import { z } from 'zod';

// override: true → .env ชนะค่าใน process.env เสมอ
// กันกรณี shell parent inject empty/wrong values
dotenv.config({ override: true });

const envSchema = z.object({
  // LINE
  LINE_CHANNEL_ID: z.string().min(5),
  LINE_CHANNEL_SECRET: z.string().length(32),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(50),
  LINE_OA_BASIC_ID: z.string().optional(),
  LINE_ADMIN_GROUP_ID: z.string().optional(),
  LINE_BOT_USER_ID: z.string().startsWith('U').optional(),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  ANTHROPIC_MAX_TOKENS: z.coerce.number().default(1024),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_ANON_KEY: z.string().min(20).optional(),

  // Email
  RESEND_API_KEY: z
    .string()
    .refine((v) => !v || v.startsWith('re_'), {
      message: 'must be empty or start with re_',
    })
    .optional(),
  LEAD_NOTIFY_EMAIL: z.string().email().default('admin@zenityxai.com'),
  LEAD_FROM_EMAIL: z.string().email().default('noreply@zenityxai.com'),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('[ERROR] Invalid environment variables:');
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    console.error('\nดูตัวอย่างที่ .env.example');
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
