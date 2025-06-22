'use client'

import { ReviewData, SlideReview, SpellingError, GrammarError, VisionError } from '@/types/review'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileDown, BookCheck, MessageSquare, Palette } from 'lucide-react'
import DiffView from './DiffView'

export default function ReviewResults({ data: reviewData }: { data: ReviewData | null }) {
  if (!reviewData) {
    return null;
  }

  const { fileName, summary, slideReviews, totalSlides } = reviewData;

  const exportReport = () => {
    // Basic CSV export logic
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Slide,Category,Issue,Details,Suggestion\n";

    slideReviews.forEach(slide => {
      slide.spellingErrors.forEach(err => {
        csvContent += `${slide.slideNumber},Spelling,"${err.word}","N/A","${err.suggestion}"\n`;
      });
      slide.grammarErrors.forEach(err => {
        csvContent += `${slide.slideNumber},Grammar,"${err.error}","${err.text.replace(/"/g, '""')}","${err.suggestion.replace(/"/g, '""')}"\n`;
      });
      slide.visionErrors.forEach(err => {
        csvContent += `${slide.slideNumber},Vision,"${err.issue}","${err.text.replace(/"/g, '""')}","N/A"\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fileName}_review_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasAnyErrors = slideReviews.some(r => r.spellingErrors.length > 0 || r.grammarErrors.length > 0 || r.visionErrors.length > 0);

  return (
    <section className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Review Results</h2>
          <p className="text-muted-foreground">Analysis for: {fileName}</p>
        </div>
        <Button onClick={exportReport}>
          <FileDown className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </header>

      <SummaryCards summary={summary} totalSlides={totalSlides} />

      <div className="space-y-8">
        {hasAnyErrors ? (
          slideReviews.map((slide) => (
            <SlideReviewCard key={slide.slideNumber} slideReview={slide} />
          ))
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Clear!</CardTitle>
            </CardHeader>
            <CardContent>
              <p>No spelling, grammar, or vision issues were found in this presentation.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

const SummaryCards = ({ summary, totalSlides }: { summary: ReviewData['summary'], totalSlides: number }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
        <Badge variant={summary.overallScore > 75 ? 'default' : 'destructive'}>
          {summary.overallScore}%
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{summary.totalErrors} Total Issues</div>
        <p className="text-xs text-muted-foreground">Across {totalSlides} slides</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Spelling Issues</CardTitle>
        <BookCheck className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{summary.totalSpellingErrors}</div>
        <p className="text-xs text-muted-foreground">Unique words flagged</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Grammar Errors</CardTitle>
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{summary.totalGrammarErrors}</div>
        <p className="text-xs text-muted-foreground">Suggestions made</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Vision Findings</CardTitle>
        <Palette className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{summary.totalVisionErrors}</div>
        <p className="text-xs text-muted-foreground">Design & layout issues</p>
      </CardContent>
    </Card>
  </div>
);

const SlideReviewCard = ({ slideReview }: { slideReview: SlideReview }) => {
  const { slideNumber, spellingErrors, grammarErrors, visionErrors } = slideReview;
  const hasSpelling = spellingErrors.length > 0;
  const hasGrammar = grammarErrors.length > 0;
  const hasVision = visionErrors.length > 0;

  // Determine the default tab. Prioritize tabs with content.
  const defaultTab = hasSpelling ? 'spelling' : hasGrammar ? 'grammar' : hasVision ? 'vision' : 'spelling';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slide {slideNumber}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="spelling" disabled={!hasSpelling}>
              Spelling ({spellingErrors.length})
            </TabsTrigger>
            <TabsTrigger value="grammar" disabled={!hasGrammar}>
              Grammar ({grammarErrors.length})
            </TabsTrigger>
            <TabsTrigger value="vision" disabled={!hasVision}>
              Vision ({visionErrors.length})
            </TabsTrigger>
          </TabsList>

          {hasSpelling && (
            <TabsContent value="spelling">
              <SpellingIssuesPanel errors={spellingErrors} />
            </TabsContent>
          )}
          {hasGrammar && (
            <TabsContent value="grammar">
              <GrammarIssuesPanel errors={grammarErrors} />
            </TabsContent>
          )}
          {hasVision && (
            <TabsContent value="vision">
               <VisionIssuesPanel errors={visionErrors} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

const SpellingIssuesPanel = ({ errors }: { errors: SpellingError[] }) => (
  <div className="p-4 mt-4 bg-amber-50 rounded-lg">
    <h3 className="font-semibold text-lg mb-3 text-amber-900">Potential Misspellings</h3>
    <p className="text-sm text-amber-800 mb-4">
      The following words were flagged. These may include brand names, technical terms, or proper nouns.
    </p>
    <div className="flex flex-wrap gap-2">
      {errors.map((error) => (
        <Badge key={error.id} variant="warning" className="text-base px-3 py-1">
          {error.word}
        </Badge>
      ))}
    </div>
  </div>
);

const GrammarIssuesPanel = ({ errors }: { errors: GrammarError[] }) => (
  <div className="space-y-6 mt-4">
    {errors.map((error) => (
      <GrammarSuggestionCard key={error.id} error={error} />
    ))}
  </div>
);

const VisionIssuesPanel = ({ errors }: { errors: VisionError[] }) => (
    <div className="space-y-6 mt-4">
      {errors.map((error) => (
        <div key={error.id} className="border-l-4 border-blue-500 p-4 rounded-r-lg bg-blue-50">
            <h4 className="font-semibold text-blue-900">🎨 Vision Finding</h4>
            <p className="italic text-blue-800">{error.issue}</p>
            {error.text !== "N/A" && <p className="text-sm text-gray-600 mt-2">Related text: "{error.text}"</p>}
        </div>
      ))}
    </div>
  );

const GrammarSuggestionCard = ({ error }: { error: GrammarError }) => {
  return (
    <div className="border-l-4 border-destructive p-4 rounded-r-lg bg-red-50">
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-destructive mb-1">❌ Original Text</h4>
          <DiffView original={error.text} suggestion={error.suggestion} type="original" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-800">🛠️ Issue: {error.error}</h4>
          <p className="text-sm text-gray-600">{error.rule || 'A grammatical rule was violated.'}</p>
        </div>
        <div>
          <h4 className="font-semibold text-green-600">✅ Suggested Fix</h4>
          <DiffView original={error.text} suggestion={error.suggestion} type="suggestion" />
        </div>
      </div>
    </div>
  );
}; 