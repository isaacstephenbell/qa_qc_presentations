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

export type TextQACategory = typeof TEXT_QA_CATEGORIES[number]
export type VisionQACategory = typeof VISION_QA_CATEGORIES[number]
export type FeedbackCategory = TextQACategory | VisionQACategory 