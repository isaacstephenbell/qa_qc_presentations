import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

interface FeedbackData {
  slideNumber: number
  slideContent: string // slide text for Text QA or slide image URL for Vision QA
  feedbackText: string
  feedbackCategory?: string
  qaType: 'text' | 'vision'
  fileName: string
  sessionId?: string
  timestamp: string
  suggestionId?: string // For rating individual suggestions
  feedbackType?: 'positive' | 'negative' | 'missed' // Type of feedback
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
    console.log('🔍 Feedback API called')
    console.log('🔍 Environment check:', {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrlValue: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...', // Show first 30 chars
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseAnonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
      isConfigured: isSupabaseConfigured()
    })
    
    const body = await req.json()
    console.log('📥 Request body received:', Object.keys(body))
    
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
      timestamp: new Date().toISOString(),
      suggestionId: body.suggestionId,
      feedbackType: body.feedbackType || 'missed'
    }

    console.log('📝 Feedback received:', {
      qaType,
      slideNumber,
      fileName,
      category: feedbackCategory,
      timestamp: feedbackEntry.timestamp
    })

    // Save to Supabase (if configured) or fallback to console logging
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('⚠️ Supabase not configured, logging feedback to console instead')
      console.log('📋 Feedback data:', JSON.stringify(feedbackEntry, null, 2))
      
      return NextResponse.json({
        success: true,
        message: 'Feedback received (logged to console - Supabase not configured)',
        timestamp: feedbackEntry.timestamp
      })
    }

    try {
      const { data, error } = await supabase
        .from('feedback')
        .insert([{
          slide_number: feedbackEntry.slideNumber,
          slide_content: feedbackEntry.slideContent,
          feedback_text: feedbackEntry.feedbackText,
          feedback_category: feedbackEntry.feedbackCategory,
          qa_type: feedbackEntry.qaType,
          file_name: feedbackEntry.fileName,
          session_id: feedbackEntry.sessionId,
          suggestion_id: feedbackEntry.suggestionId,
          feedback_type: feedbackEntry.feedbackType
        }])
        .select()

      if (error) {
        console.error('❌ Supabase error:', error)
        // Fallback to console logging instead of throwing error
        console.warn('⚠️ Falling back to console logging due to Supabase error')
        console.log('📋 Feedback data (not saved to DB):', JSON.stringify(feedbackEntry, null, 2))
        
        return NextResponse.json({
          success: true,
          message: 'Feedback received (logged to console - Supabase error)',
          timestamp: feedbackEntry.timestamp
        })
      }

      console.log('✅ Feedback saved to Supabase:', data?.[0]?.id)
      
      return NextResponse.json({
        success: true,
        message: 'Feedback received successfully',
        feedbackId: `${qaType}_${slideNumber}_${Date.now()}`
      })
    } catch (dbError) {
      console.error('❌ Failed to save feedback to database:', dbError)
      // Fallback: log to console for debugging instead of throwing error
      console.warn('⚠️ Falling back to console logging due to database connection error')
      console.log('📋 Feedback data (not saved to DB):', JSON.stringify(feedbackEntry, null, 2))
      
      return NextResponse.json({
        success: true,
        message: 'Feedback received (logged to console - database unavailable)',
        timestamp: feedbackEntry.timestamp
      })
    }

  } catch (error) {
    console.error('❌ Feedback API error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    })
    return NextResponse.json(
      { success: false, error: 'Failed to process feedback', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 