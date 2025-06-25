'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface SuggestionFeedbackProps {
  suggestionId: string
  suggestionText: string
  slideNumber: number
  qaType: 'text' | 'vision'
  fileName: string
  sessionId?: string
}

export default function SuggestionFeedback({ 
  suggestionId, 
  suggestionText, 
  slideNumber, 
  qaType, 
  fileName, 
  sessionId 
}: SuggestionFeedbackProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFeedback = async (feedbackType: 'positive' | 'negative') => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slideNumber,
          slideContent: suggestionText,
          feedbackText: feedbackType === 'positive' 
            ? 'User marked this suggestion as helpful/correct'
            : 'User marked this suggestion as unhelpful/incorrect',
          feedbackCategory: feedbackType === 'positive' ? 'Positive' : 'Negative',
          qaType,
          fileName,
          sessionId,
          suggestionId,
          feedbackType
        })
      })

      if (response.ok) {
        setFeedback(feedbackType)
      } else {
        console.error('Failed to submit suggestion feedback')
      }
    } catch (error) {
      console.error('Error submitting suggestion feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (feedback) {
    return (
      <div className="flex items-center space-x-2 mt-2 text-sm">
        {feedback === 'positive' ? (
          <div className="flex items-center text-green-600">
            <ThumbsUp className="h-4 w-4 mr-1" />
            <span>Thanks for the feedback!</span>
          </div>
        ) : (
          <div className="flex items-center text-orange-600">
            <ThumbsDown className="h-4 w-4 mr-1" />
            <span>Feedback noted - we'll improve this.</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2 mt-2">
      <span className="text-xs text-gray-500">Was this helpful?</span>
      <Button
        onClick={() => handleFeedback('positive')}
        disabled={isSubmitting}
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-green-600 hover:bg-green-50 hover:text-green-700"
      >
        <ThumbsUp className="h-3 w-3 mr-1" />
        Yes
      </Button>
      <Button
        onClick={() => handleFeedback('negative')}
        disabled={isSubmitting}
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <ThumbsDown className="h-3 w-3 mr-1" />
        No
      </Button>
    </div>
  )
} 