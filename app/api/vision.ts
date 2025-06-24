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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

async function callGeminiVision(base64Png: string, prompt: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-vision:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      { parts: [{ text: prompt }] },
      { parts: [{ inlineData: { mimeType: "image/png", data: base64Png } }] }
    ]
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
  }
  const result = await response.json();
  // Gemini returns an array of candidates, each with content.parts[0].text
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = [];
  }
  return parsed;
}

export async function POST(req: NextRequest) {
  const pythonProcessorUrl = process.env.PYTHON_PROCESSOR_URL;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!pythonProcessorUrl || !geminiApiKey) {
    return NextResponse.json(
      { success: false, error: 'Server configuration error: Missing processor or Gemini API key.' },
      { status: 500 }
    );
  }
  try {
    const body = await req.json();
    const fileUrl = body.fileUrl;
    const originalFileName = path.basename(new URL(fileUrl).pathname);
    if (!fileUrl) {
      return NextResponse.json({ success: false, error: 'No file URL provided' }, { status: 400 });
    }
    // Download the file from Vercel Blob
    const blobResponse = await fetch(fileUrl);
    if (!blobResponse.ok) {
      throw new Error(`Failed to download file from blob: ${blobResponse.statusText}`);
    }
    const fileData = await blobResponse.blob();
    // Forward the file to the Python processor service for PNG conversion
    const formData = new FormData();
    formData.append('file', fileData, originalFileName);
    const processResponse = await fetch(`${pythonProcessorUrl}/vision/`, {
      method: 'POST',
      body: formData,
    });
    let processedData;
    if (!processResponse.ok) {
      const errorBody = await processResponse.text();
      throw new Error(`Python processor service failed: ${processResponse.status} ${errorBody}`);
    } else {
      processedData = await processResponse.json();
    }
    const imagePaths = processedData.image_paths || [];
    // Run Gemini Vision on each PNG
    const visionResults = await Promise.all(imagePaths.map(async (imgPath: string, idx: number) => {
      const imageBuffer = fs.readFileSync(imgPath);
      const base64Image = imageBuffer.toString('base64');
      try {
        const findings = await callGeminiVision(base64Image, visionPrompt(idx + 1), geminiApiKey);
        return { slide: idx + 1, findings: Array.isArray(findings) ? findings : [] };
      } catch (e) {
        return { slide: idx + 1, findings: [], error: e instanceof Error ? e.message : String(e) };
      }
    }));
    return NextResponse.json({ success: true, data: { fileName: originalFileName, visionResults } });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
} 