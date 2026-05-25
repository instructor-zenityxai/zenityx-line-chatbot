import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';

// Note: เลิกใช้ Database generic ของ Supabase v2.106 เพราะ generic constraint
// strict เกินไปกับ hand-rolled types. ใช้ raw client แล้ว cast row types
// ใน service layer (ดู types.ts สำหรับ row interfaces)
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
