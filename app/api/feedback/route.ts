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

    // For now, we'll log to a JSON file
    // In production, you'd want to use a proper database like Firestore or Supabase
    try {
      const feedbackDir = path.join(process.cwd(), 'feedback-logs')
      const feedbackFile = path.join(feedbackDir, `feedback-${qaType}-${Date.now()}.json`)
      
      // Create directory if it doesn't exist
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