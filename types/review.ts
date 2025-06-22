export interface ReviewData {
  fileName: string;
  totalSlides: number;
  slideReviews: SlideReview[];
  summary: {
    totalErrors: number;
    totalTextualErrors: number;
    totalVisionErrors: number;
    overallScore: number;
    processingTime: number;
  };
}

export interface SlideReview {
  slideNumber: number;
  textualErrors: TextualError[];
  visionErrors: VisionError[];
}

export interface TextualError {
  id: string;
  slideNumber: number;
  type: 'Spelling' | 'Grammar' | 'Style' | 'Clarity';
  text: string;
  errorFragment?: string;
  error: string;
  rule: string;
  suggestion: string;
}

export interface VisionError {
  id: string;
  slideNumber: number;
  text: string;
  issue: string;
  type: 'vision';
}

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