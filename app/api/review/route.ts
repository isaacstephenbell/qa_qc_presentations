import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdtemp, rm } from 'fs/promises'
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { ReviewData, TextualError, VisionError, SlideText, SlideReview } from '@/types/review'
import * as fs from 'fs';
import * as path from 'path'
import * as os from 'os'

// --- PROMPTS and CONFIG ---

const grammarSystemPrompt = `You are an expert editor and proofreader. Your task is to meticulously review the provided text for any and all errors, including spelling, grammar, punctuation, capitalization, style, and clarity. Return your findings in a structured JSON format.

The JSON output must be an object with a single key "textualErrors", which is an array of objects.
Each error object must have the following keys:
- "type": The category of the error. Must be one of: "Spelling", "Grammar", "Style", "Clarity".
- "sentence": The full sentence where the error occurred.
- "errorFragment": The exact word or phrase within the sentence that is incorrect.
- "error": A short name for the error (e.g., "Misspelled word", "Subject-verb agreement").
- "rule": A brief, one-sentence explanation of the rule that was violated.
- "suggestion": The full, corrected sentence.

Example:
{
  "textualErrors": [
    {
      "type": "Spelling",
      "sentence": "This is a sentance with a typo.",
      "errorFragment": "sentance",
      "error": "Misspelled word",
      "rule": "Ensure all words are spelled correctly.",
      "suggestion": "This is a sentence with a typo."
    },
    {
      "type": "Grammar",
      "sentence": "The team were ready.",
      "errorFragment": "were",
      "error": "Subject-verb agreement",
      "rule": "Use a singular verb for a collective noun acting as a single unit.",
      "suggestion": "The team was ready."
    }
  ]
}

If no errors are found, you must return:
{
  "textualErrors": []
}
`;

const buildGrammarPrompt = (slide: SlideText) => `
Analyze the following slide text for grammar, punctuation, and capitalization errors ONLY. Do not check for spelling.
Slide ${slide.slide}: "${slide.text}"
Return your response in this exact JSON format. If no errors are found, return an empty array.
{
  "grammarErrors": [
    {
      "sentence": "The team were ready to present their idea.",
      "error": "Subject-verb agreement",
      "rule": "'team' is a collective noun treated as singular in this context.",
      "suggestion": "The team was ready to present their idea."
    }
  ]
}`;

const spellingWhitelist = new Set(['AI', 'ML', 'UMA', 'CICERO', 'LLM', 'GPT']);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

// --- CORE LOGIC ---

export async function POST(req: NextRequest) {
  const pythonProcessorUrl = process.env.PYTHON_PROCESSOR_URL;

  if (!pythonProcessorUrl) {
    console.error('PYTHON_PROCESSOR_URL is not set.');
    return NextResponse.json(
      { success: false, error: 'Server configuration error: Missing processor URL.' },
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

    // 1. Download the file from Vercel Blob
    const blobResponse = await fetch(fileUrl);
    if (!blobResponse.ok) {
      throw new Error(`Failed to download file from blob: ${blobResponse.statusText}`);
    }
    const fileData = await blobResponse.blob();

    // 2. Forward the file to the Python processor service
    const formData = new FormData();
    formData.append('file', fileData, originalFileName);

    const processResponse = await fetch(`${pythonProcessorUrl}/process/`, {
      method: 'POST',
      body: formData,
    });

    if (!processResponse.ok) {
      const errorBody = await processResponse.text();
      throw new Error(`Python processor service failed: ${processResponse.status} ${errorBody}`);
    }

    const processedData = await processResponse.json();
    const slideData = processedData.text_data.map((slide: any) => ({
        slide: slide.slide_number,
        text: `${slide.title}\n${slide.bullets.map((b: any) => b.text).join('\n')}`
    }));

    // Only do text analysis with OpenAI
    const analysis = await analyzePresentation(slideData, originalFileName);

    return NextResponse.json({ success: true, data: analysis });

  } catch (err) {
    console.error('❌ Top-level API error:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown server error occurred.';
    return NextResponse.json(
      { success: false, error: 'Failed to process presentation', details: errorMessage },
      { status: 500 }
    );
  }
}

async function analyzePresentation(slideData: SlideText[], fileName: string): Promise<ReviewData> {
  const startTime = Date.now();
  
  const model = createOpenAIModel();

  const analysisPromises = slideData.map(async (slide) => {
    const textualErrors = await runTextualAnalysis(slide, model);
    return {
      slide,
      textualErrors,
      visionErrors: [] // Vision analysis is handled separately by /api/vision
    };
  });

  const analysisResults = await Promise.all(analysisPromises);

  const slideReviews: SlideReview[] = analysisResults
    .filter(result => result.textualErrors.length > 0)
    .map(result => ({
      slideNumber: result.slide.slide,
      textualErrors: result.textualErrors,
      visionErrors: result.visionErrors
    }));

  const totalTextualErrors = slideReviews.reduce((sum, r) => sum + r.textualErrors.length, 0);
  const totalVisionErrors = 0; // Vision analysis is handled separately
  const totalErrors = totalTextualErrors;

  return {
    fileName,
    totalSlides: slideData.length,
    slideReviews,
    summary: {
      totalErrors,
      totalTextualErrors,
      totalVisionErrors,
      overallScore: Math.max(0, 100 - totalErrors * 5),
      processingTime: Date.now() - startTime,
    }
  };
}

// --- HELPER FUNCTIONS ---

// Analysis Functions
function createOpenAIModel() {
  return new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.0,
    openAIApiKey: process.env.OPENAI_API_KEY
  });
}

async function runTextualAnalysis(slide: SlideText, model: ChatOpenAI): Promise<TextualError[]> {
  if (!slide.text || slide.text.trim().length < 5) return [];

  try {
    const response = await model.invoke([
      new SystemMessage(grammarSystemPrompt),
      new HumanMessage(buildGrammarPrompt(slide)),
    ], { response_format: { type: "json_object" } });
    
    const parsed = lenientJsonParse(response.content.toString());
    if (!parsed.textualErrors || !Array.isArray(parsed.textualErrors)) return [];

    return parsed.textualErrors.map((err: any) => ({
      id: `${slide.slide}-txt-${Math.random().toString(36).substring(2, 8)}`,
      slideNumber: slide.slide,
      type: err.type || 'Grammar',
      text: err.sentence,
      errorFragment: err.errorFragment,
      error: err.error,
      rule: err.rule || "N/A",
      suggestion: err.suggestion,
    })).filter((e: any) => e.text && e.error && e.suggestion);
  } catch (e) {
    console.warn(`AI textual analysis failed for slide ${slide.slide}:`, e);
    return [];
  }
}

// UTILITY FUNCTIONS

function lenientJsonParse(json: string): any {
  try {
    return JSON.parse(json);
  } catch (e) {
    console.warn("Failed to parse strict JSON, trying lenient parse:", json);
    try {
      // A common failure is the AI wrapping the JSON in markdown backticks.
      const sanitized = json.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(sanitized);
    } catch (e2) {
      console.error("Lenient JSON parsing also failed:", e2);
      return {};
    }
  }
} 