export type SpellingError = {
  id: string;
  slideNumber: number;
  word: string;
  suggestion: string;
  type: 'spelling';
};

export type GrammarError = {
  id: string;
  slideNumber: number;
  text: string;
  errorFragment?: string;
  error: string;
  rule: string;
  suggestion: string;
  type: 'grammar';
};

export type VisionError = {
  id: string;
  slideNumber: number;
  text: string;
  issue: string;
  type: 'vision';
}

export type SlideReview = {
  slideNumber: number;
  spellingErrors: SpellingError[];
  grammarErrors: GrammarError[];
  visionErrors: VisionError[];
};

export type ReviewData = {
  fileName: string;
  totalSlides: number;
  slideReviews: SlideReview[];
  summary: {
    totalErrors: number;
    totalSpellingErrors: number;
    totalGrammarErrors: number;
    totalVisionErrors: number;
    overallScore: number;
    processingTime: number;
  };
};

export type SlideText = {
  slide: number;
  text: string;
};

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