// Test if fetch works to any external API at all
export const runtime = "nodejs"

export async function GET() {
  console.log("🧪 Testing basic fetch capability...")
  
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts/1")
    const json = await response.json()
    
    console.log("✅ External fetch works:", response.status)
    
    return Response.json({ 
      status: 200, 
      json,
      message: "External fetch works - issue is Supabase-specific"
    })
  } catch (err) {
    console.error("❌ External fetch failed:", err)
    
    return Response.json({ 
      error: String(err),
      message: "Even basic fetch is broken - Vercel region issue"
    }, { status: 500 })
  }
} 