import { NextResponse } from 'next/server'
import { ChatOpenAI } from "@langchain/openai"

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        status: 'error',
        message: 'OPENAI_API_KEY is not configured',
        configured: false
      })
    }

    const model = new ChatOpenAI({ openAIApiKey: apiKey })
    
    // Test the API key with a simple request
    const response = await model.invoke("Say 'Hello'")

    const testResponse = response.content.toString()

    if (testResponse.toLowerCase().includes('hello')) {
      return NextResponse.json({
        status: 'success',
        message: 'API is working correctly',
        configured: true,
        testResponse: testResponse
      })
    } else {
      return NextResponse.json({
        status: 'error',
        message: 'API key seems configured, but test call failed.',
        configured: true,
        testResponse: testResponse
      })
    }

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      configured: !!process.env.OPENAI_API_KEY
    })
  }
} 