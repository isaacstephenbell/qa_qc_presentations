import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { spawn } from 'child_process'
import path from 'path'
import os from 'os'
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { ReviewData, GrammarError, SpellingError, SlideText } from '@/types/review'
import Spellchecker from 'simple-spellchecker';

const grammarSystemPrompt = `
You are a meticulous and rule-based senior grammar editor. Your only task is to identify objective grammar, punctuation, and capitalization errors. Return your findings in the specified JSON format. Do not provide any commentary or text outside of the JSON object.
`;

const buildGrammarPrompt = (slide: SlideText) => `
Analyze the following slide text for grammar, punctuation, and capitalization errors ONLY. Do not check for spelling.

Slide ${slide.slide}:
"${slide.text}"

For each sentence, check for objective grammatical errors.
- Justify each correction with the rule violated.
- Do not suggest stylistic improvements (e.g., passive voice, word choice).

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
}
`;

function lenientJsonParse(jsonString: string) {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.warn("Standard JSON.parse failed, trying lenient parse.", e);
        // Attempt to fix common issues, like trailing commas
        const fixedJson = jsonString
            .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
        try {
            return JSON.parse(fixedJson);
        } catch (finalError) {
            console.error("Lenient JSON parse also failed.", finalError);
            throw new Error("Failed to parse JSON from model response.");
        }
    }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    let slideData: SlideText[] = [];

    if (fileExtension === 'pptx') {
      // Handle PowerPoint files using Python script
      const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}.pptx`);
      await writeFile(tempFilePath, buffer);
      
      slideData = await extractTextFromPowerPoint(tempFilePath);
      
      // Clean up temp file
      try {
        await unlink(tempFilePath);
      } catch (cleanupErr) {
        console.warn('Failed to cleanup temp file:', cleanupErr);
      }
    } else if (fileExtension === 'pdf') {
      // Handle PDF files
      slideData = await extractTextFromPdf(buffer);
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Please upload a .pptx or .pdf file.' },
        { status: 400 }
      );
    }

    if (slideData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No text content found in the file' },
        { status: 400 }
      );
    }

    // Analyze with Claude AI
    const analysis = await analyzeWithAI(slideData, fileName);

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (err) {
    console.error('❌ Top-level API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Unhandled exception',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

async function extractTextFromPowerPoint(filePath: string): Promise<SlideText[]> {
  return new Promise((resolve, reject) => {
    const pythonExecutable = "C:\\Users\\IsaacBell\\AppData\\Local\\Programs\\Python\\Python313\\python.exe";
    const scriptPath = path.resolve('./scripts/parse_pptx.py');
    const pythonProcess = spawn(pythonExecutable, [scriptPath, filePath]);
    
    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { error += data.toString(); });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}`);
        console.error(`stderr from Python script: ${error}`);
        // Try to parse stderr as JSON, if it fails, use the raw string
        try {
          const parsedError = JSON.parse(error);
          return reject(new Error(parsedError.error || `Python script failed.`));
        } catch (e) {
          return reject(new Error(`Python script failed: ${error}`));
        }
      }
      try {
        // The python script returns an array of {slide_number, title, bullets}
        // We need to convert this to {slide, text}
        const parsed = JSON.parse(output);
        const slideTexts: SlideText[] = parsed.map((slide: any) => ({
          slide: slide.slide_number,
          text: `${slide.title}\n${slide.bullets.map((b: any) => b.text).join('\n')}`
        }));
        resolve(slideTexts);
      } catch (e) {
        reject(new Error('Failed to parse JSON from Python script.'));
      }
    });
  });
}

async function extractTextFromPdf(fileBuffer: Buffer): Promise<SlideText[]> {
    const pdf = (await import('pdf-parse')).default;
    const data = await pdf(fileBuffer);
    const pages = data.text.split(/\f/g);
    return pages.map((pageText: string, index: number) => ({
      slide: index + 1,
      text: pageText.trim() || 'This page is empty or contains only images.'
    }));
}

async function analyzeWithAI(slideData: SlideText[], fileName: string): Promise<ReviewData> {
  const startTime = Date.now();
  const spellingErrors: SpellingError[] = [];
  const grammarErrors: GrammarError[] = [];
  
  const dictionary = await new Promise<Spellchecker>((resolve, reject) => {
    Spellchecker.getDictionary('en_US', './dictionaries', (err: Error | null, dict: Spellchecker | undefined) => {
      if (err) return reject(err);
      if (!dict) return reject(new Error('Dictionary could not be loaded.'));
      resolve(dict);
    });
  });

  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.0,
    openAIApiKey: process.env.OPENAI_API_KEY
  }).bind({
    response_format: { type: "json_object" },
  });

  for (const slide of slideData) {
    if (!slide.text || slide.text.trim().length < 5) {
        continue;
    }
      
    try {
      // --- Pass 1: Algorithmic Spelling Check ---
      if (dictionary) {
        const words = slide.text.match(/\b\w+\b/g) || [];
        for (const word of words) {
          if (!dictionary.spellCheck(word)) {
            const suggestions = dictionary.getSuggestions(word, 1);
            spellingErrors.push({
              id: `${slide.slide}-sp-${word}`,
              slideNumber: slide.slide,
              word: word,
              suggestion: suggestions.length > 0 ? suggestions[0] : "N/A",
              type: "spelling"
            });
          }
        }
      }

      // --- Pass 2: LLM Grammar Check ---
      const grammarPrompt = buildGrammarPrompt(slide);
      const grammarResponse = await model.invoke([
        new SystemMessage(grammarSystemPrompt),
        new HumanMessage(grammarPrompt),
      ]);
      const grammarParsed = lenientJsonParse(grammarResponse.content.toString());

      if (grammarParsed.grammarErrors && Array.isArray(grammarParsed.grammarErrors)) {
        for (const err of grammarParsed.grammarErrors) {
          if (err.sentence && err.error && err.suggestion) {
            grammarErrors.push({
              id: `${slide.slide}-gr-${Math.random().toString(36).substring(2, 8)}`,
              slideNumber: slide.slide,
              text: err.sentence, 
              error: err.error,
              rule: err.rule || "N/A",
              suggestion: err.suggestion,
              type: "grammar"
            });
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to process or parse AI response for slide ${slide.slide}:`, e);
    }
  }

  const processingTime = Date.now() - startTime;

  return {
    fileName,
    totalSlides: slideData.length,
    spellingErrors,
    grammarErrors,
    writingSuggestions: [], // Deprecated for now
    flowAnalysis: [], // Deprecated for now
    summary: {
      totalErrors: spellingErrors.length + grammarErrors.length,
      totalSuggestions: 0,
      overallScore: Math.max(0, 100 - (spellingErrors.length + grammarErrors.length) * 5),
      processingTime,
    }
  };
} 