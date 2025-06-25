export interface FeedbackSubmission {
  slideNumber: number
  slideContent: string // slide text for Text QA or slide image URL for Vision QA
  feedbackText: string
  feedbackCategory?: string
  qaType: 'text' | 'vision'
  fileName: string
  sessionId?: string
}

export interface FeedbackData extends FeedbackSubmission {
  timestamp: string
  feedbackId: string
}

export interface FeedbackResponse {
  success: boolean
  message?: string
  error?: string
  feedbackId?: string
}

export const TEXT_QA_CATEGORIES = [
  'Grammar',
  'Tone', 
  'Clarity',
  'Redundancy',
  'Other'
] as const

export const VISION_QA_CATEGORIES = [
  'Alignment',
  'Spacing', 
  'Color Contrast',
  'Font Issues',
  'Other'
] as const

// Supabase database types
export interface SupabaseFeedbackRow {
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

export type TextQACategory = typeof TEXT_QA_CATEGORIES[number]
export type VisionQACategory = typeof VISION_QA_CATEGORIES[number]
export type FeedbackCategory = TextQACategory | VisionQACategory 