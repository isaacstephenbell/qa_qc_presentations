import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create a Supabase client with service role key for server-side operations
// During build time, environment variables might not be available, so we create a mock client
// Fallback to anon key for testing if service role key fails
const activeKey = supabaseServiceKey || supabaseAnonKey
export const supabase = (supabaseUrl && activeKey) 
  ? createClient(supabaseUrl, activeKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && (supabaseServiceKey || supabaseAnonKey))
}

// Database types for feedback table
export interface FeedbackRow {
  id: string
  slide_number: number
  slide_content: string
  feedback_text: string
  feedback_category: string | null
  qa_type: 'text' | 'vision'
  file_name: string
  session_id: string | null
  suggestion_id: string | null
  feedback_type: 'positive' | 'negative' | 'missed'
  created_at: string
} 