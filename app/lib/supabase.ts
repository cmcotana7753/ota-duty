import { createClient } from '@supabase/supabase-js'

// 直接填入 Supabase URL 與 Anon Key，確保 Build 時 100% 抓得到
const supabaseUrl = 'https://aqwnlyojloqptfgdhlrp.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_p5pSOCJUHaLlu1qW9YQqmg_V6ZRAra8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)