import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdtemp, rm } from 'fs/promises'
import * as fs from 'fs';
import * as path from 'path'
import * as os from 'os'

const visionPrompt = (slideNumber: number) => `
You are a meticulous presentation QA reviewer.

The following image is slide ${slideNumber} of a corporate presentation.

Your job is to identify any **visual formatting errors**, including:
- Misaligned text, titles, charts, or shapes
- Overlapping elements
- Inconsistent spacing between bullets or lines
- Missing logos or branding
- Cut-off or overflowing text
- Inconsistent fonts (size, weight, style)
- Uneven layout or unbalanced visual spacing

Be aggressive. Assume you're auditing this for professional delivery.

Output a JSON array like this:
[
  {
    "text": "(brief visible text or area with issue)",
    "issue": "(specific visual problem)",
    "type": "alignment | layout | font | branding | other"
  }
]

If no issues are visible, return an empty array: []
`;

async function callOpenAIVision(base64Png: string, prompt: string, apiKey: string) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const body = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Png}` } }
        ]
      }
    ],
    max_tokens: 1024,
    temperature: 0.3
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const result = await response.json();
  // Log the full OpenAI response for debugging
  console.log('[OpenAI] Raw response:', JSON.stringify(result, null, 2));
  const text = result.choices?.[0]?.message?.content || '';
  console.log('[OpenAI] Raw text:', text);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    console.warn('⚠️ Failed to parse OpenAI response as JSON. Raw text:', text);
    parsed = [];
  }
  return parsed;
}

export async function POST(req: NextRequest) {
  const pythonProcessorUrl = process.env.PYTHON_PROCESSOR_URL;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  console.log('PYTHON_PROCESSOR_URL:', pythonProcessorUrl);
  
  console.log('🚀 Vision API called');
  
  console.log('🔧 Environment check:', {
    hasPythonUrl: !!pythonProcessorUrl,
    hasOpenAIKey: !!openaiApiKey,
    pythonUrl: pythonProcessorUrl,
    openaiKeyPrefix: openaiApiKey ? openaiApiKey.substring(0, 10) + '...' : 'NOT_SET'
  });
  
  if (!pythonProcessorUrl || !openaiApiKey) {
    console.error('❌ Missing environment variables');
    return NextResponse.json(
      { success: false, error: 'Server configuration error: Missing processor or OpenAI API key.' },
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
      console.log('📦 [Vision] Raw processedData from Python:', JSON.stringify(processedData, null, 2));
      console.log('✅ Python processor response:', processedData);
    }

    // Use the new images array with base64 data
    const images: { slide: number; base64: string }[] = processedData.images || [];
    console.log('🧠 [Vision] images received from processor:', images.length);

    if (images.length === 0) {
      console.warn('⚠️ No images returned from Python processor. Skipping OpenAI calls.');
      return NextResponse.json({ 
        success: true, 
        data: { 
          fileName: originalFileName, 
          visionResults: [],
          message: 'No slides were processed into images'
        } 
      });
    }

    // Add log before OpenAI loop
    console.log('🟢 About to call OpenAI for each slide:', images.length, 'slides');
    // Run OpenAI Vision on each base64 image
    const visionResults = await Promise.all(images.map(async (img) => {
      console.log(`📨 Calling OpenAI for slide ${img.slide}`);
      console.log(`[Vision] Slide ${img.slide} base64 length:`, img.base64.length);
      try {
        const findings = await callOpenAIVision(img.base64, visionPrompt(img.slide), openaiApiKey);
        console.log(`✅ OpenAI call succeeded for slide ${img.slide}`);
        return { slide: img.slide, findings: Array.isArray(findings) ? findings : [] };
      } catch (e) {
        console.error(`❌ OpenAI call failed for slide ${img.slide}:`, e);
        return { slide: img.slide, findings: [], error: e instanceof Error ? e.message : String(e) };
      }
    }));
    
    console.log('🎉 Vision analysis complete, results:', visionResults);
    return NextResponse.json({ success: true, data: { fileName: originalFileName, visionResults } });
    
  } catch (e) {
    console.error('❌ Vision API error:', e);
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
} 