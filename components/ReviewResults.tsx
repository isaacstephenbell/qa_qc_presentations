'use client'

import { ReviewData, SlideReview, TextualError, VisionError } from '@/types/review'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileDown, BookCheck, MessageSquare, Palette } from 'lucide-react'
import DiffView from './DiffView'
import FeedbackForm from './FeedbackForm'

export default function ReviewResults({ data, onReset }: { data: ReviewData; onReset: () => void; }) {
  if (!data || !data.slideReviews) {
    return <p>No review data available.</p>;
  }

  const allTextualIssues = data.slideReviews.flatMap(r => r.textualErrors);
  const allVisionIssues = data.slideReviews.flatMap(r => r.visionErrors);

  // Separate textual issues into errors vs suggestions
  const grammarErrors = allTextualIssues.filter(error => 
    error.type === 'Spelling' || error.type === 'Grammar'
  );
  const writingSuggestions = allTextualIssues.filter(error => 
    error.type === 'Style' || error.type === 'Clarity'
  );

  const exportReport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Slide,Category,Issue,Details,Suggestion\n";

    grammarErrors.forEach(error => {
      csvContent += `${error.slideNumber},Grammar,"${error.error}","${error.text.replace(/"/g, '""')}","${error.suggestion.replace(/"/g, '""')}"\n`;
    });
    
    writingSuggestions.forEach(error => {
      csvContent += `${error.slideNumber},Writing,"${error.error}","${error.text.replace(/"/g, '""')}","${error.suggestion.replace(/"/g, '""')}"\n`;
    });
    
    allVisionIssues.forEach(error => {
        csvContent += `${error.slideNumber},Visual,"${error.issue}","${error.text.replace(/"/g, '""')}","N/A"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${data.fileName}_review_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Review Complete</h2>
          <p className="text-muted-foreground mt-2">
            Analyzed <span className="font-semibold">{data.fileName}</span> ({data.totalSlides} slides) in {Math.round(data.summary.processingTime / 1000)}s.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mt-6 text-center">
          <div className="rounded-xl border bg-card text-card-foreground p-4">
            <div className="text-2xl font-bold">{data.summary.overallScore}</div>
            <p className="text-xs text-muted-foreground">Overall Score</p>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground p-4">
            <div className="text-2xl font-bold">{grammarErrors.length}</div>
            <p className="text-xs text-muted-foreground">Grammar Errors</p>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground p-4">
            <div className="text-2xl font-bold">{writingSuggestions.length}</div>
            <p className="text-xs text-muted-foreground">Writing Suggestions</p>
          </div>
          <div className="rounded-xl border bg-card text-card-foreground p-4">
            <div className="text-2xl font-bold">{allVisionIssues.length}</div>
            <p className="text-xs text-muted-foreground">Visual Design Issues</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto mt-8">
        {data.slideReviews.length > 0 ? (
          <Tabs defaultValue="grammar" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="grammar" className="flex items-center gap-2">
                <BookCheck className="h-4 w-4" />
                Grammar & Punctuation ({grammarErrors.length})
              </TabsTrigger>
              <TabsTrigger value="writing" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Writing Suggestions ({writingSuggestions.length})
              </TabsTrigger>
              <TabsTrigger value="visual" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Visual Design ({allVisionIssues.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="grammar" className="mt-4">
              <h3 className="text-xl font-semibold mb-4">Grammar & Punctuation Errors</h3>
              <p className="text-sm text-muted-foreground mb-4">These are errors that should be fixed for proper grammar and spelling.</p>
              {grammarErrors.length > 0 ? (
                (() => {
                  // Group grammar errors by slide
                  const errorsBySlide = grammarErrors.reduce((acc, error) => {
                    if (!acc[error.slideNumber]) acc[error.slideNumber] = [];
                    acc[error.slideNumber].push(error);
                    return acc;
                  }, {} as Record<number, TextualError[]>);

                  return Object.entries(errorsBySlide)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([slideNumber, errors]) => (
                      <div key={slideNumber} className="mb-8">
                        <h4 className="text-lg font-medium text-muted-foreground mb-4">Slide {slideNumber}</h4>
                        {errors.map((error) => (
                          <GrammarSuggestionCard key={error.id} error={error} />
                        ))}
                        <FeedbackForm
                          slideNumber={parseInt(slideNumber)}
                          slideContent={errors[0]?.text || ''}
                          qaType="text"
                          fileName={data.fileName}
                          sessionId={`review_${Date.now()}`}
                        />
                      </div>
                    ));
                })()
              ) : (
                <div className="text-center py-8 text-green-600">
                  <BookCheck className="h-12 w-12 mx-auto mb-2" />
                  <p className="font-medium">No grammar or punctuation errors found!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="writing" className="mt-4">
              <h3 className="text-xl font-semibold mb-4">Writing Suggestions</h3>
              <p className="text-sm text-muted-foreground mb-4">These are suggestions to improve clarity, style, and professionalism.</p>
              {writingSuggestions.length > 0 ? (
                (() => {
                  // Group writing suggestions by slide
                  const suggestionsBySlide = writingSuggestions.reduce((acc, error) => {
                    if (!acc[error.slideNumber]) acc[error.slideNumber] = [];
                    acc[error.slideNumber].push(error);
                    return acc;
                  }, {} as Record<number, TextualError[]>);

                  return Object.entries(suggestionsBySlide)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([slideNumber, errors]) => (
                      <div key={slideNumber} className="mb-8">
                        <h4 className="text-lg font-medium text-muted-foreground mb-4">Slide {slideNumber}</h4>
                        {errors.map((error) => (
                          <WritingSuggestionCard key={error.id} error={error} />
                        ))}
                        <FeedbackForm
                          slideNumber={parseInt(slideNumber)}
                          slideContent={errors[0]?.text || ''}
                          qaType="text"
                          fileName={data.fileName}
                          sessionId={`review_${Date.now()}`}
                        />
                      </div>
                    ));
                })()
              ) : (
                <div className="text-center py-8 text-blue-600">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2" />
                  <p className="font-medium">No writing suggestions - your content is already clear and professional!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="visual" className="mt-4">
              <h3 className="text-xl font-semibold mb-4">Visual Design Analysis</h3>
              <p className="text-sm text-muted-foreground mb-4">AI-powered analysis of layout, readability, and visual hierarchy using Gemini Vision.</p>
              {allVisionIssues.length > 0 ? (
                (() => {
                  // Group vision issues by slide
                  const issuesBySlide = allVisionIssues.reduce((acc, error) => {
                    if (!acc[error.slideNumber]) acc[error.slideNumber] = [];
                    acc[error.slideNumber].push(error);
                    return acc;
                  }, {} as Record<number, VisionError[]>);

                  return Object.entries(issuesBySlide)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([slideNumber, errors]) => (
                      <div key={slideNumber} className="mb-8">
                        <h4 className="text-lg font-medium text-muted-foreground mb-4">Slide {slideNumber}</h4>
                        {errors.map((error) => (
                          <VisionErrorCard key={error.id} error={error} />
                        ))}
                        <FeedbackForm
                          slideNumber={parseInt(slideNumber)}
                          slideContent={`Slide ${slideNumber} visual content`}
                          qaType="vision"
                          fileName={data.fileName}
                          sessionId={`review_${Date.now()}`}
                        />
                      </div>
                    ));
                })()
              ) : (
                <div className="text-center py-8 text-purple-600">
                  <Palette className="h-12 w-12 mx-auto mb-2" />
                  <p className="font-medium">No visual design issues found!</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-2xl font-semibold">🎉 Excellent! 🎉</h3>
            <p className="text-muted-foreground mt-2">No issues were found in your presentation.</p>
          </div>
        )}
      </div>

      <div className="text-center mt-8">
        <Button onClick={onReset}>Review Another Presentation</Button>
      </div>
    </div>
  );
}

function GrammarSuggestionCard({ error }: { error: TextualError }) {
  return (
    <Card className="mb-4 border-red-200 bg-red-50/30">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <CardTitle className="text-lg font-semibold text-red-800">{error.error}</CardTitle>
            <CardDescription className="text-red-600">{error.rule}</CardDescription>
          </div>
          <Badge variant="destructive" className="text-sm font-medium">{error.type}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <DiffView original={error.text} corrected={error.suggestion} />
      </CardContent>
    </Card>
  );
}

function WritingSuggestionCard({ error }: { error: TextualError }) {
  return (
    <Card className="mb-4 border-blue-200 bg-blue-50/30">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <CardTitle className="text-lg font-semibold text-blue-800">{error.error}</CardTitle>
            <CardDescription className="text-blue-600">{error.rule}</CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm font-medium">{error.type}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <DiffView original={error.text} corrected={error.suggestion} />
      </CardContent>
    </Card>
  );
}

const VisionErrorCard = ({ error }: { error: VisionError }) => (
  <div className="border-l-4 border-purple-500 p-4 rounded-r-lg bg-purple-50">
    <h4 className="font-semibold text-purple-900">🎨 Visual Design Suggestion</h4>
    <p className="italic text-purple-800">{error.issue}</p>
    {error.text !== "N/A" && <p className="text-sm text-gray-600 mt-2">Related text: "{error.text}"</p>}
  </div>
); 