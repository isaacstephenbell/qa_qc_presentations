import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdtemp, rm } from 'fs/promises'
import * as fs from 'fs';
import * as path from 'path'
import * as os from 'os'

const visionPrompt = (slideNumber: number) => `
You are an expert presentation reviewer. Review this slide image for:
- Inconsistent bullet spacing
- Misaligned elements (titles, text boxes, logos, etc.)
- Inconsistent font styles or sizes
- Overlapping elements
- Text cut off or overflowing boxes
- Missing branding elements (e.g., logo in top-right)
- Uneven slide layouts or spacing inconsistencies

Respond with a JSON array of issues using this format:
[
  {
    "text": "the text or area with the issue (if visible)",
    "issue": "e.g., Overlapping elements: title overlaps with logo",
    "type": "formatting|alignment|font|branding|layout|other"
  }
]`;

async function callGeminiVision(base64Png: string, prompt: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-vision:generateContent?key=${apiKey}`;
  console.log('📡 [Gemini] Preparing request...');
  const body = {
    contents: [
      { parts: [{ text: prompt }] },
      { parts: [{ inlineData: { mimeType: "image/png", data: base64Png } }] }
    ]
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    console.log(`📬 [Gemini] Response status: ${response.status}`);
    const rawText = await response.text();
    console.log(`[Gemini] Raw response body:`, rawText);
    if (!response.ok) {
      throw new Error(`Gemini API failed: ${response.status} ${rawText}`);
    }
    const result = JSON.parse(rawText);
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    let parsed;
    try {
      parsed = JSON.parse(text);
      console.log('✅ [Gemini] Parsed response:', parsed);
    } catch (parseError) {
      console.warn('⚠️ [Gemini] Failed to parse as JSON. Raw text:', text);
      parsed = [];
    }
    return parsed;
  } catch (err) {
    console.error('❌ [Gemini] Fetch error:', err);
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const pythonProcessorUrl = process.env.PYTHON_PROCESSOR_URL;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  console.log('PYTHON_PROCESSOR_URL:', pythonProcessorUrl);
  
  console.log('🚀 Vision API called');
  
  console.log('🔧 Environment check:', {
    hasPythonUrl: !!pythonProcessorUrl,
    hasGeminiKey: !!geminiApiKey,
    pythonUrl: pythonProcessorUrl,
    geminiKeyPrefix: geminiApiKey ? geminiApiKey.substring(0, 10) + '...' : 'NOT_SET'
  });
  
  if (!pythonProcessorUrl || !geminiApiKey) {
    console.error('❌ Missing environment variables');
    console.error('PYTHON_PROCESSOR_URL:', pythonProcessorUrl);
    console.error('GEMINI_API_KEY:', geminiApiKey ? 'SET' : 'NOT_SET');
    return NextResponse.json(
      { success: false, error: 'Server configuration error: Missing processor or Gemini API key.' },
      { status: 500 }
    );
  }
  
  try {
    const body = await req.json();
    const fileUrl = body.fileUrl;
    const originalFileName = path.basename(new URL(fileUrl).pathname);
    
    console.log('📁 Processing file:', originalFileName);
    
    if (!fileUrl) {
      return NextResponse.json({ success: false, error: 'No file URL provided' }, { status: 400 });
    }
    
    // Download the file from Vercel Blob
    console.log('⬇️ Downloading file from blob...');
    const blobResponse = await fetch(fileUrl);
    if (!blobResponse.ok) {
      throw new Error(`Failed to download file from blob: ${blobResponse.statusText}`);
    }
    const fileData = await blobResponse.blob();
    console.log('✅ File downloaded, size:', fileData.size);
    
    // Forward the file to the Python processor service for PNG conversion
    const formData = new FormData();
    formData.append('file', fileData, originalFileName);
    
    console.log('🔄 Sending to Python processor:', `${pythonProcessorUrl}/vision/`);
    const processResponse = await fetch(`${pythonProcessorUrl}/vision/`, {
      method: 'POST',
      body: formData,
    });
    
    let processedData;
    if (!processResponse.ok) {
      const errorBody = await processResponse.text();
      console.error('❌ Python processor failed:', processResponse.status, errorBody);
      throw new Error(`Python processor service failed: ${processResponse.status} ${errorBody}`);
    } else {
      processedData = await processResponse.json();
      console.log('🟠 Raw Python processor response:', processedData);
      console.log('✅ Python processor response:', processedData);
    }
    
    const imagePaths = processedData.image_paths || [];
    console.log('🖼️ Image paths received:', imagePaths);
    
    if (imagePaths.length === 0) {
      console.warn('⚠️ No image paths returned from Python processor. Skipping Gemini calls.');
      return NextResponse.json({ 
        success: true, 
        data: { 
          fileName: originalFileName, 
          visionResults: [],
          message: 'No slides were processed into images'
        } 
      });
    }
    
    // Add log before Gemini loop
    console.log('🟢 About to call Gemini for each slide:', imagePaths.length, 'slides');
    // Run Gemini Vision on each PNG
    console.log('🔍 Starting Gemini Vision analysis on', imagePaths.length, 'slides...');
    const visionResults = await Promise.all(imagePaths.map(async (imgPath: string, idx: number) => {
      console.log(`📨 Calling Gemini for slide ${idx + 1}`);
      try {
        // Check if file exists
        if (!fs.existsSync(imgPath)) {
          console.error(`❌ Image file not found: ${imgPath}`);
          return { slide: idx + 1, findings: [], error: `Image file not found: ${imgPath}` };
        }
        const imageBuffer = fs.readFileSync(imgPath);
        const base64Image = imageBuffer.toString('base64');
        const findings = await callGeminiVision(base64Image, visionPrompt(idx + 1), geminiApiKey);
        console.log(`✅ Gemini call succeeded for slide ${idx + 1}`);
        return { slide: idx + 1, findings: Array.isArray(findings) ? findings : [] };
      } catch (e) {
        console.error(`❌ Gemini call failed for slide ${idx + 1}:`, e);
        return { slide: idx + 1, findings: [], error: e instanceof Error ? e.message : String(e) };
      }
    }));
    
    console.log('🎉 Vision analysis complete, results:', visionResults);
    return NextResponse.json({ success: true, data: { fileName: originalFileName, visionResults } });
    
  } catch (e) {
    console.error('❌ Vision API error:', e);
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
} 