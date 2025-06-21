'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { ReviewData } from '@/types/review'
import toast from 'react-hot-toast'

interface FileUploadProps {
  onReviewComplete: (data: ReviewData) => void
  onProcessingStart: () => void
  isProcessing: boolean
}

export default function FileUpload({ onReviewComplete, onProcessingStart, isProcessing }: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) {
      toast.error('No file selected')
      return
    }

    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    })

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/pdf'
    ]
    
    if (!validTypes.includes(file.type)) {
      const errorMsg = `Invalid file type: ${file.type}. Please upload a PowerPoint or PDF file.`
      console.error(errorMsg)
      toast.error(errorMsg)
      setUploadError(errorMsg)
      return
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      const errorMsg = `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 50MB limit`
      console.error(errorMsg)
      toast.error(errorMsg)
      setUploadError(errorMsg)
      return
    }

    // Check if file is empty
    if (file.size === 0) {
      const errorMsg = 'File appears to be empty'
      console.error(errorMsg)
      toast.error(errorMsg)
      setUploadError(errorMsg)
      return
    }

    setUploadedFile(file)
    setUploadError(null)
    onProcessingStart()

    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('Sending file to API...')
      
      const response = await fetch('/api/review', {
        method: 'POST',
        body: formData,
      })

      console.log('API Response status:', response.status)
      console.log('API Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error Response:', errorText)
        
        let errorMessage = 'Failed to process file'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('Review data received:', result)
      
      if (result.success) {
        onReviewComplete(result.data)
        toast.success('Review completed successfully!')
      } else {
        throw new Error(result.error || 'API returned an error')
      }
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to process file. Please try again.'
      toast.error(errorMessage)
      setUploadError(errorMessage)
      onProcessingStart() // Reset processing state
    }
  }, [onReviewComplete, onProcessingStart])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: isProcessing,
    onDropRejected: (rejectedFiles) => {
      console.error('Files rejected:', rejectedFiles)
      const errors = rejectedFiles.map(({ file, errors }) => 
        `${file.name}: ${errors.map(e => e.message).join(', ')}`
      ).join('; ')
      toast.error(`File rejected: ${errors}`)
      setUploadError(errors)
    }
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`dropzone p-8 text-center cursor-pointer transition-all duration-200 border-2 border-dashed rounded-lg ${
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        
        {uploadedFile ? (
          <div className="space-y-3">
            <FileText className="w-12 h-12 text-primary-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isProcessing && (
              <p className="text-sm text-gray-600">Click or drag to replace</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isDragActive ? 'Drop your file here' : 'Upload PowerPoint or PDF file'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Drag and drop, or click to select
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-900">Upload Error</p>
              <p className="text-xs text-red-700">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      {/* File requirements */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">File Requirements</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li className="flex items-center">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
            PowerPoint (.pptx, .ppt) or PDF (.pdf) files only
          </li>
          <li className="flex items-center">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
            Maximum file size: 50MB
          </li>
          <li className="flex items-center">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></div>
            Up to 100 slides per presentation
          </li>
        </ul>
      </div>

      {/* Processing status */}
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <p className="text-sm font-medium text-blue-900">Processing...</p>
              <p className="text-xs text-blue-700">Analyzing your presentation</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 