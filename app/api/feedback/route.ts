import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import * as path from 'path'

interface FeedbackData {
  slideNumber: number
  slideContent: string // slide text for Text QA or slide image URL for Vision QA
  feedbackText: string
  feedbackCategory?: string
  qaType: 'text' | 'vision'
  fileName: string
  sessionId?: string
  timestamp: string
}

// TODO: Supabase Integration
// When ready to integrate Supabase, replace the file logging below with:
// 
// import { createClient } from '@supabase/supabase-js'
// 
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// )
//
// Suggested Supabase table schema:
// CREATE TABLE feedback (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   slide_number INTEGER NOT NULL,
//   slide_content TEXT NOT NULL,
//   feedback_text TEXT NOT NULL,
//   feedback_category VARCHAR(50),
//   qa_type VARCHAR(10) NOT NULL CHECK (qa_type IN ('text', 'vision')),
//   file_name VARCHAR(255) NOT NULL,
//   session_id VARCHAR(100),
//   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
// );
//
// Then replace the file writing logic with:
// const { data, error } = await supabase
//   .from('feedback')
//   .insert([{
//     slide_number: feedbackEntry.slideNumber,
//     slide_content: feedbackEntry.slideContent,
//     feedback_text: feedbackEntry.feedbackText,
//     feedback_category: feedbackEntry.feedbackCategory,
//     qa_type: feedbackEntry.qaType,
//     file_name: feedbackEntry.fileName,
//     session_id: feedbackEntry.sessionId
//   }])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate required fields
    const { 
      slideNumber, 
      slideContent, 
      feedbackText, 
      feedbackCategory, 
      qaType, 
      fileName 
    } = body

    if (!slideNumber || !slideContent || !feedbackText || !qaType || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['text', 'vision'].includes(qaType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid QA type. Must be "text" or "vision"' },
        { status: 400 }
      )
    }

    // Create feedback entry
    const feedbackEntry: FeedbackData = {
      slideNumber,
      slideContent,
      feedbackText,
      feedbackCategory: feedbackCategory || 'Other',
      qaType,
      fileName,
      sessionId: body.sessionId || `session_${Date.now()}`,
      timestamp: new Date().toISOString()
    }

    console.log('📝 Feedback received:', {
      qaType,
      slideNumber,
      fileName,
      category: feedbackCategory,
      timestamp: feedbackEntry.timestamp
    })

    // TEMPORARY: File-based logging (will be replaced with Supabase)
    try {
      const feedbackDir = path.join(process.cwd(), 'feedback-logs')
      const feedbackFile = path.join(feedbackDir, `feedback-${qaType}-${Date.now()}.json`)
      
      await writeFile(feedbackFile, JSON.stringify(feedbackEntry, null, 2))
      console.log('✅ Feedback saved to:', feedbackFile)
    } catch (fileError) {
      console.warn('⚠️ Could not save feedback to file, logging to console instead:', fileError)
      console.log('📋 Feedback data:', JSON.stringify(feedbackEntry, null, 2))
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback received successfully',
      feedbackId: `${qaType}_${slideNumber}_${Date.now()}`
    })

  } catch (error) {
    console.error('❌ Feedback API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process feedback' },
      { status: 500 }
    )
  }
} 