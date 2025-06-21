import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export async function GET() {
  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        status: 'error',
        message: 'ANTHROPIC_API_KEY is not configured',
        configured: false
      })
    }

    // Test the API key with a simple request
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: 'Say "Hello"'
        }
      ]
    })

    return NextResponse.json({
      status: 'success',
      message: 'API is working correctly',
      configured: true,
      testResponse: response.content[0].type === 'text' ? response.content[0].text : 'Response received'
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      configured: !!process.env.ANTHROPIC_API_KEY
    })
  }
} 