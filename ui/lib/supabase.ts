import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Reads from env at build/runtime; ensure these are set in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabase: SupabaseClient | null = null
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Avoid crashing the app if envs are missing; log a helpful warning
  console.warn('Supabase env not set: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export { supabase }