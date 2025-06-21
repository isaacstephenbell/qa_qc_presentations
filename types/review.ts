export interface SlideText {
  slide: number;
  text: string;
}

export interface SpellingError {
  id: string;
  slideNumber: number;
  word: string;
  suggestion: string;
  type: 'spelling';
}

export interface GrammarError {
  id: string;
  slideNumber: number;
  text: string;
  error: string;
  suggestion: string;
  rule?: string;
  type: 'grammar' | 'punctuation' | 'capitalization';
}

export interface WritingSuggestion {
  id: string;
  slideNumber: number;
  originalText: string;
  suggestion: string;
  reason: string;
  type: 'clarity' | 'tone' | 'professionalism' | 'consistency';
}

export interface FlowAnalysis {
  slideNumber: number;
  title: string;
  issues: string[];
  suggestions: string[];
  flowScore: number;
}

export interface ReviewSummary {
  totalErrors: number;
  totalSuggestions: number;
  overallScore: number;
  processingTime: number;
}

export interface ReviewData {
  fileName: string;
  totalSlides: number;
  spellingErrors: SpellingError[];
  grammarErrors: GrammarError[];
  writingSuggestions: WritingSuggestion[];
  flowAnalysis: FlowAnalysis[];
  summary: ReviewSummary;
} 