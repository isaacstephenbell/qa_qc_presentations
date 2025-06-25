import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create a Supabase client with anon key for server-side operations
// This is simpler and should have better connectivity than service role key
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
  return !!(supabaseUrl && supabaseAnonKey)
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