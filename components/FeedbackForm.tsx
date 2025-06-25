'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { TEXT_QA_CATEGORIES, VISION_QA_CATEGORIES, FeedbackSubmission, FeedbackResponse } from '@/types/feedback'

interface FeedbackFormProps {
  slideNumber: number
  slideContent: string // slide text for Text QA or slide image URL for Vision QA
  qaType: 'text' | 'vision'
  fileName: string
  sessionId?: string
}



export default function FeedbackForm({ 
  slideNumber, 
  slideContent, 
  qaType, 
  fileName, 
  sessionId 
}: FeedbackFormProps) {
  const [showForm, setShowForm] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackCategory, setFeedbackCategory] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const categories = qaType === 'text' ? TEXT_QA_CATEGORIES : VISION_QA_CATEGORIES

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!feedbackText.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slideNumber,
          slideContent,
          feedbackText: feedbackText.trim(),
          feedbackCategory: feedbackCategory || 'Other',
          qaType,
          fileName,
          sessionId
        })
      })

      if (response.ok) {
        setSubmitted(true)
        setFeedbackText('')
        setFeedbackCategory('')
        
        // Hide the success message after 3 seconds
        setTimeout(() => {
          setShowForm(false)
          setSubmitted(false)
        }, 3000)
      } else {
        console.error('Failed to submit feedback')
        alert('Failed to submit feedback. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Error submitting feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card className="p-4 bg-green-50 border-green-200 mt-4">
        <div className="flex items-center space-x-2">
          <span className="text-green-600">✅</span>
          <p className="text-green-800 font-medium">
            Thanks! Your feedback will help us improve.
          </p>
        </div>
      </Card>
    )
  }

  if (!showForm) {
    return (
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Did we miss anything on this slide?
          </p>
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            ✏️ Submit Feedback
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-4 mt-4 bg-blue-50 border-blue-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="feedback-text" className="block text-sm font-medium text-gray-700 mb-2">
            What should we have flagged or improved? *
          </label>
          <textarea
            id="feedback-text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            required
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Please describe what we missed or could improve..."
          />
        </div>

        <div>
          <label htmlFor="feedback-category" className="block text-sm font-medium text-gray-700 mb-2">
            Type of issue (optional)
          </label>
          <select
            id="feedback-category"
            value={feedbackCategory}
            onChange={(e) => setFeedbackCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a category...</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="flex space-x-2">
          <Button
            type="submit"
            disabled={isSubmitting || !feedbackText.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? 'Sending...' : 'Send Feedback'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
} 