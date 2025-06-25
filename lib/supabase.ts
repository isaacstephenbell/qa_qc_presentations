import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create a Supabase client with service role key for server-side operations
// During build time, environment variables might not be available, so we create a mock client
export const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseServiceKey)
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