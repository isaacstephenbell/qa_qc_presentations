'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ApiStatus {
  status: 'loading' | 'success' | 'error'
  message: string
  configured: boolean
  testResponse?: string
}

export default function ApiStatus() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    status: 'loading',
    message: 'Checking API status...',
    configured: false
  })

  useEffect(() => {
    checkApiStatus()
  }, [])

  const checkApiStatus = async () => {
    try {
      const response = await fetch('/api/test')
      const data = await response.json()
      
      setApiStatus({
        status: data.status === 'success' ? 'success' : 'error',
        message: data.message,
        configured: data.configured,
        testResponse: data.testResponse
      })
    } catch (error) {
      setApiStatus({
        status: 'error',
        message: 'Failed to connect to API',
        configured: false
      })
    }
  }

  const getStatusIcon = () => {
    switch (apiStatus.status) {
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return apiStatus.configured ? 
          <AlertCircle className="w-5 h-5 text-yellow-600" /> : 
          <XCircle className="w-5 h-5 text-red-600" />
    }
  }

  const getStatusColor = () => {
    switch (apiStatus.status) {
      case 'loading':
        return 'bg-blue-50 border-blue-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return apiStatus.configured ? 
          'bg-yellow-50 border-yellow-200' : 
          'bg-red-50 border-red-200'
    }
  }

  const getStatusTextColor = () => {
    switch (apiStatus.status) {
      case 'loading':
        return 'text-blue-900'
      case 'success':
        return 'text-green-900'
      case 'error':
        return apiStatus.configured ? 
          'text-yellow-900' : 
          'text-red-900'
    }
  }

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className={`text-sm font-medium ${getStatusTextColor()}`}>
            API Status
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {apiStatus.message}
          </p>
          {apiStatus.status === 'error' && !apiStatus.configured && (
            <div className="mt-2 text-xs text-red-700">
              <p className="font-medium">To fix this:</p>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Create a <code className="bg-red-100 px-1 rounded">.env.local</code> file in your project root</li>
                <li>Add your OpenAI API key: <code className="bg-red-100 px-1 rounded">OPENAI_API_KEY=your_key_here</code></li>
                <li>Restart the development server</li>
              </ol>
            </div>
          )}
        </div>
        <button
          onClick={checkApiStatus}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Refresh
        </button>
      </div>
    </div>
  )
} 