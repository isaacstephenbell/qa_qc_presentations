// Force Node.js runtime instead of Edge for full network access
export const runtime = "nodejs"

export async function GET() {
  const url = process.env.SUPABASE_URL + "/rest/v1/feedback"
  const key = process.env.SUPABASE_ANON_KEY

  console.log("🧪 Testing Supabase connection...")
  console.log("🌐 URL:", url)
  console.log("🔑 Key length:", key?.length)

  if (!url || !key) {
    return Response.json({ 
      error: "Missing environment variables",
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_ANON_KEY
    })
  }

  try {
    const res = await fetch(url, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      }
    })
    
    const result = await res.json()
    
    console.log("✅ Supabase response:", res.status, result)
    
    return Response.json({ 
      status: res.status, 
      result,
      url,
      success: res.ok
    })
  } catch (e) {
    console.error("❌ Supabase test failed:", e)
    return Response.json({ 
      error: String(e),
      url,
      type: e instanceof Error ? e.name : 'Unknown'
    })
  }
} 