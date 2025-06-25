// Test raw Supabase insert with detailed debugging
export const runtime = "nodejs"

export async function GET() {
  const url = process.env.SUPABASE_URL + "/rest/v1/feedback"
  const key = process.env.SUPABASE_ANON_KEY

  console.log("🧪 Testing raw Supabase insert...")
  console.log("🌐 URL:", url)
  console.log("🔑 Key (first 20 chars):", key?.substring(0, 20) + "...")

  if (!url || !key) {
    return Response.json({ 
      error: "Missing environment variables",
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_ANON_KEY
    })
  }

  const testPayload = {
    slide_number: 1,
    slide_content: "Test content from API",
    feedback_text: "Test feedback from raw insert",
    feedback_category: "Test",
    qa_type: "text",
    file_name: "test.pptx",
    session_id: "test-session-" + Date.now(),
    timestamp: new Date().toISOString(),
    suggestion_id: "test-suggestion",
    feedback_type: "positive"
  }

  try {
    console.log("🔍 Sending payload:", testPayload)
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(testPayload)
    })
    
    const result = await res.text()
    let parsedResult
    
    try {
      parsedResult = JSON.parse(result)
    } catch {
      parsedResult = result
    }
    
    console.log("✅ Raw insert response:", {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      result: parsedResult
    })
    
    return Response.json({ 
      status: res.status, 
      result: parsedResult,
      success: res.ok,
      payload: testPayload
    })
  } catch (e) {
    console.error("❌ Raw insert failed:", e)
    return Response.json({ 
      error: String(e),
      type: e instanceof Error ? e.name : 'Unknown'
    })
  }
} 