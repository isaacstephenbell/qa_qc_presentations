import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// Create a Supabase client with anon key for server-side operations
// Using server-side environment variables (not NEXT_PUBLIC_*)
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
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