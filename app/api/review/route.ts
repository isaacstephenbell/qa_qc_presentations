import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdtemp, rm } from 'fs/promises'
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { ReviewData, TextualError, VisionError, SlideText, SlideReview } from '@/types/review'
import * as fs from 'fs';
import * as path from 'path'
import * as os from 'os'
import { spawn } from 'child_process'

// --- PROMPTS and CONFIG ---

const visionSystemPrompt = `You are an expert presentation reviewer. Your task is to review a slide image for spelling, grammar, punctuation, and capitalization errors. Be concise and objective. Reply with a JSON array of issues found. If no issues are found, return an empty array.`;

const buildVisionPrompt = (slideNumber: number) => `
Please review this slide image for:
- Spelling mistakes (even in headings or labels)
- Grammar or punctuation errors
- Misuse of capitalization or formatting in text

Respond with a JSON array of issues using this exact format:
[
  {
    "text": "the text or area with the issue (if visible)",
    "issue": "e.g., Spelling error: 'Innoive' should be 'Innovative'",
    "type": "spelling|grammar|capitalization|other"
  }
]`;

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

// --- CORE LOGIC ---

export async function POST(req: NextRequest) {
  const tempFilePaths: string[] = [];
  const tempDirPaths: string[] = [];

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // 1. Save uploaded file temporarily
    const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}-${file.name}`);
    await writeFile(tempFilePath, Buffer.from(await file.arrayBuffer()));
    tempFilePaths.push(tempFilePath);

    // 1. Extract text from the presentation
    const slideData = await extractTextFromPowerPoint(tempFilePath);

    // Vision analysis is disabled, so we pass an empty array.
    const analysis = await analyzePresentation(slideData, [], file.name);

    return NextResponse.json({ success: true, data: analysis });

  } catch (err) {
    console.error('❌ Top-level API error:', err);
    return NextResponse.json(
      { success: false, error: 'Unhandled exception', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  } finally {
    // 4. Cleanup all temporary files and directories
    for (const path of tempFilePaths) {
      await unlink(path).catch(e => console.warn(`Failed to cleanup temp file: ${path}`, e));
    }
    for (const path of tempDirPaths) {
      await rm(path, { recursive: true, force: true }).catch(e => console.warn(`Failed to cleanup temp dir: ${path}`, e));
    }
  }
}

async function analyzePresentation(slideData: SlideText[], pngPaths: string[], fileName: string): Promise<ReviewData> {
  const startTime = Date.now();
  
  const model = createOpenAIModel();

  const slideReviews: SlideReview[] = [];
  for (const slide of slideData) {
    const textualErrors = await runTextualAnalysis(slide, model);
    const visionErrors: VisionError[] = []; // Vision analysis is disabled.
    
    if (textualErrors.length > 0) {
      slideReviews.push({
        slideNumber: slide.slide,
        textualErrors,
        visionErrors
      });
    }
  }

  const totalTextualErrors = slideReviews.reduce((sum, r) => sum + r.textualErrors.length, 0);
  const totalVisionErrors = 0; // Vision analysis is disabled.
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

// Text Extraction & PNG Conversion
async function extractTextFromPowerPoint(filePath: string): Promise<SlideText[]> {
  const parsed = await runPythonScript('./scripts/parse_pptx.py', [filePath]);
  return parsed.map((slide: any) => ({
    slide: slide.slide_number,
    text: `${slide.title}\n${slide.bullets.map((b: any) => b.text).join('\n')}`
  }));
}

async function convertPptxToPng(filePath: string, outputDir: string): Promise<any> {
  const result = await runPythonScript('./scripts/convert_pptx_to_png.py', [filePath, outputDir]);
  if (result.error) {
    throw new Error(`Python script failed: ${JSON.stringify(result)}`);
  }
  return result;
}

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

async function runVisionCheck(imagePath: string, slideNumber: number, model: ChatOpenAI): Promise<VisionError[]> {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await model.invoke([
        new HumanMessage({
            content: [
                { type: "text", text: buildVisionPrompt(slideNumber) },
                { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
            ]
        })
    ], { response_format: { type: "json_object" } });

    const parsed = lenientJsonParse(response.content.toString());
    if (!Array.isArray(parsed)) return [];

    return parsed.map((err: any) => ({
      id: `${slideNumber}-vis-${Math.random().toString(36).substring(2, 8)}`,
      slideNumber: slideNumber,
      text: err.text || "N/A",
      issue: err.issue,
      type: 'vision'
    })).filter((e: any) => e.issue) as VisionError[];
  } catch (e) {
    console.warn(`AI vision check failed for slide ${slideNumber}:`, e);
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

function runPythonScript(scriptPath: string, args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonExecutable = "C:\\Users\\IsaacBell\\AppData\\Local\\Programs\\Python\\Python313\\python.exe";
    const process = spawn(pythonExecutable, [scriptPath, ...args]);
    
    let stdout = '';
    let stderr = '';
    process.stdout.on('data', (data) => { stdout += data.toString(); });
    process.stderr.on('data', (data) => { stderr += data.toString(); });

    process.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script ${scriptPath} exited with code ${code}. Stderr: ${stderr}`);
        reject(new Error(stderr || `Python script failed with code ${code}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error('Failed to parse JSON from Python script.'));
      }
    });
  });
} 