import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdtemp, rm } from 'fs/promises'
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { ReviewData, GrammarError, SpellingError, VisionError, SlideText, SlideReview } from '@/types/review'
import nspell from 'nspell';
import * as fs from 'fs';
import path from 'path'
import os from 'os'
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

const grammarSystemPrompt = `You are an expert grammar and spelling checker. Your only task is to identify objective grammar, punctuation, and capitalization errors. Return your findings in the specified JSON format. Do not provide any commentary or text outside of the JSON object.

The JSON output should be an object with a single key "grammarErrors", which is an array of objects.
Each error object must have the following keys:
- "sentence": The full sentence where the error occurred.
- "errorFragment": The exact word or phrase within the sentence that is incorrect. If the error is about the absence of something (e.g., a missing comma), this can be null.
- "error": A short name for the error (e.g., "Subject-verb agreement").
- "rule": A brief, one-sentence explanation of the grammar rule.
- "suggestion": The full sentence corrected.

Example:
{
  "grammarErrors": [
    {
      "sentence": "The team were ready to begin.",
      "errorFragment": "were",
      "error": "Subject-verb agreement",
      "rule": "Use a singular verb for a collective noun acting as a single unit.",
      "suggestion": "The team was ready to begin."
    }
  ]
}

If no errors are found, return:
{
  "grammarErrors": []
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

type NSpell = ReturnType<typeof nspell>;

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

    // 2. Convert PPTX to PNGs for vision analysis (TEMPORARILY DISABLED)
    // const pngOutputDir = await mkdtemp(path.join(os.tmpdir(), 'pptx-png-'));
    // tempDirPaths.push(pngOutputDir);
    // await convertPptxToPng(tempFilePath, pngOutputDir);
    // const pngPaths = fs.readdirSync(pngOutputDir).map(f => path.join(pngOutputDir, f));
    const pngPaths: string[] = []; // Pass an empty array to skip vision analysis

    // 3. Run analysis pipeline
    const analysis = await analyzePresentation(slideData, pngPaths, file.name);

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
  
  const dictionary = await getDictionary();
  const model = createOpenAIModel();

  const slideReviews: SlideReview[] = [];
  for (const slide of slideData) {
    const pngPath = pngPaths.find(p => p.includes(`slide${slide.slide}`));

    const spellingErrors = dictionary ? await runSpellingCheck(slide, dictionary) : [];
    const grammarErrors = await runGrammarCheck(slide, model);
    const visionErrors = pngPath ? await runVisionCheck(pngPath, slide.slide, model) : [];
    
    if (spellingErrors.length > 0 || grammarErrors.length > 0 || visionErrors.length > 0) {
      slideReviews.push({
        slideNumber: slide.slide,
        spellingErrors,
        grammarErrors,
        visionErrors
      });
    }
  }

  const totalSpellingErrors = slideReviews.reduce((sum, r) => sum + r.spellingErrors.length, 0);
  const totalGrammarErrors = slideReviews.reduce((sum, r) => sum + r.grammarErrors.length, 0);
  const totalVisionErrors = slideReviews.reduce((sum, r) => sum + r.visionErrors.length, 0);
  const totalErrors = totalSpellingErrors + totalGrammarErrors + totalVisionErrors;

  return {
    fileName,
    totalSlides: slideData.length,
    slideReviews,
    summary: {
      totalErrors,
      totalSpellingErrors,
      totalGrammarErrors,
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

async function getDictionary(): Promise<NSpell | null> {
  try {
    const affPath = path.join(process.cwd(), 'dictionaries', 'en_US.aff');
    const dicPath = path.join(process.cwd(), 'dictionaries', 'en_US.dic');

    const aff = fs.readFileSync(affPath, 'utf8');
    const dic = fs.readFileSync(dicPath, 'utf8');

    const spell = nspell(aff, dic);
    return spell;
  } catch (err) {
    console.error("Dictionary could not be loaded for nspell.", err);
    return null;
  }
}

function checkWord(word: string, dictionary: NSpell): boolean {
  if (!word || word.length <= 1) return true;
  if (dictionary.correct(word)) return true;
  if (dictionary.correct(word.toLowerCase())) return true;
  if (word.length > 1) {
    const capitalized = word[0].toUpperCase() + word.slice(1).toLowerCase();
    if (dictionary.correct(capitalized)) return true;
  }
  return false;
}

async function runSpellingCheck(slide: SlideText, dictionary: NSpell): Promise<SpellingError[]> {
  const errors: SpellingError[] = [];
  if (!slide.text) return errors;

  const words = slide.text.match(/[\w'-]+/g) || [];
  const flaggedWords = new Set<string>();

  for (const originalWord of words) {
    if (spellingWhitelist.has(originalWord.toUpperCase()) || !isNaN(parseInt(originalWord)) || flaggedWords.has(originalWord.toLowerCase())) {
      continue;
    }
    if (!checkWord(originalWord, dictionary)) {
      flaggedWords.add(originalWord.toLowerCase());
      const suggestions = dictionary.suggest(originalWord.toLowerCase());
      errors.push({
        id: `${slide.slide}-sp-${originalWord}`,
        slideNumber: slide.slide,
        word: originalWord,
        suggestion: suggestions.length > 0 ? suggestions[0] : "N/A",
        type: "spelling"
      });
    }
  }
  return errors;
}

async function runGrammarCheck(slide: SlideText, model: ChatOpenAI): Promise<GrammarError[]> {
  if (!slide.text || slide.text.trim().length < 5) return [];

  try {
    const response = await model.invoke([
      new SystemMessage(grammarSystemPrompt),
      new HumanMessage(buildGrammarPrompt(slide)),
    ], { response_format: { type: "json_object" } });
    
    const parsed = lenientJsonParse(response.content.toString());
    if (!parsed.grammarErrors || !Array.isArray(parsed.grammarErrors)) return [];

    return parsed.grammarErrors.map((err: any) => ({
      id: `${slide.slide}-gr-${Math.random().toString(36).substring(2, 8)}`,
      slideNumber: slide.slide,
      text: err.sentence,
      errorFragment: err.errorFragment,
      error: err.error,
      rule: err.rule || "N/A",
      suggestion: err.suggestion,
      type: "grammar"
    })).filter((e: any) => e.text && e.error && e.suggestion);
  } catch (e) {
    console.warn(`AI grammar check failed for slide ${slide.slide}:`, e);
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

function lenientJsonParse(jsonString: string) {
  try {
    return JSON.parse(jsonString.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (e) {
    console.warn("JSON.parse failed for string:", jsonString, e);
    return {}; // Return empty object on failure to prevent crashes
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