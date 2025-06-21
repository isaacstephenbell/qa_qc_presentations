'use client'

import { useState } from 'react'
import { ReviewData, GrammarError, WritingSuggestion, FlowAnalysis } from '@/types/review'
import { AlertCircle, CheckCircle, Edit3, TrendingUp, Download } from 'lucide-react'

interface ReviewResultsProps {
  data: ReviewData
}

export default function ReviewResults({ data }: ReviewResultsProps) {
  const [activeTab, setActiveTab] = useState<'grammar' | 'writing' | 'flow'>('grammar')

  const tabs = [
    { id: 'grammar', label: 'Grammar & Spelling', count: data.grammarErrors.length, icon: AlertCircle },
    { id: 'writing', label: 'Writing Suggestions', count: data.writingSuggestions.length, icon: Edit3 },
    { id: 'flow', label: 'Narrative Flow', count: data.flowAnalysis.length, icon: TrendingUp },
  ]

  const exportReport = () => {
    // TODO: Implement export functionality
    console.log('Exporting report...')
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Slides</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalSlides}</p>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-error-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-error-600">Grammar Errors</p>
              <p className="text-2xl font-bold text-error-900">{data.summary.totalErrors}</p>
            </div>
            <div className="w-8 h-8 bg-error-200 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-error-600" />
            </div>
          </div>
        </div>

        <div className="bg-warning-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-warning-600">Suggestions</p>
              <p className="text-2xl font-bold text-warning-900">{data.summary.totalSuggestions}</p>
            </div>
            <div className="w-8 h-8 bg-warning-200 rounded-lg flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="bg-primary-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-600">Overall Score</p>
              <p className="text-2xl font-bold text-primary-900">{data.summary.overallScore}%</p>
            </div>
            <div className="w-8 h-8 bg-primary-200 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={exportReport}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'grammar' && (
          <GrammarTab errors={data.grammarErrors} />
        )}
        {activeTab === 'writing' && (
          <WritingTab suggestions={data.writingSuggestions} />
        )}
        {activeTab === 'flow' && (
          <FlowTab analysis={data.flowAnalysis} />
        )}
      </div>
    </div>
  )
}

function GrammarTab({ errors }: { errors: GrammarError[] }) {
  if (errors.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No grammar errors found!</h3>
        <p className="text-gray-600">Your presentation looks great from a grammar perspective.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {errors.map((error) => (
        <div key={error.id} className="border border-error-200 rounded-lg p-4 bg-error-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800">
                  Slide {error.slideNumber}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {error.type}
                </span>
              </div>
              <p className="text-sm text-gray-900 mb-2">
                <span className="font-medium">Error:</span> {error.error}
              </p>
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-medium">Text:</span> "{error.text}"
              </p>
              <p className="text-sm text-success-700">
                <span className="font-medium">Suggestion:</span> {error.suggestion}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function WritingTab({ suggestions }: { suggestions: WritingSuggestion[] }) {
  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No writing suggestions!</h3>
        <p className="text-gray-600">Your writing is clear and professional.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {suggestions.map((suggestion) => (
        <div key={suggestion.id} className="border border-warning-200 rounded-lg p-4 bg-warning-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
                  Slide {suggestion.slideNumber}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {suggestion.type}
                </span>
              </div>
              <p className="text-sm text-gray-900 mb-2">
                <span className="font-medium">Original:</span> "{suggestion.originalText}"
              </p>
              <p className="text-sm text-success-700 mb-2">
                <span className="font-medium">Suggestion:</span> "{suggestion.suggestion}"
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Reason:</span> {suggestion.reason}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function FlowTab({ analysis }: { analysis: FlowAnalysis[] }) {
  return (
    <div className="space-y-6">
      {analysis.map((slide, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Slide {slide.slideNumber}: {slide.title}</h4>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Flow Score:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                slide.flowScore >= 80 ? 'bg-success-100 text-success-800' :
                slide.flowScore >= 60 ? 'bg-warning-100 text-warning-800' :
                'bg-error-100 text-error-800'
              }`}>
                {slide.flowScore}%
              </span>
            </div>
          </div>
          
          {slide.issues.length > 0 && (
            <div className="mb-3">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Issues:</h5>
              <ul className="text-sm text-gray-700 space-y-1">
                {slide.issues.map((issue, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-error-500 mr-2">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {slide.suggestions.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-2">Suggestions:</h5>
              <ul className="text-sm text-gray-700 space-y-1">
                {slide.suggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-success-500 mr-2">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
} 