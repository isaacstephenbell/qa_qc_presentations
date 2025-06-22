'use client'

import { useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, File as FileIcon, X } from 'lucide-react'
import { upload } from '@vercel/blob/client'

interface FileUploadProps {
  onReviewComplete: (data: any) => void
  onProcessingStart: () => void
  isProcessing: boolean
}

export default function FileUpload({ onReviewComplete, onProcessingStart, isProcessing }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const droppedFile = acceptedFiles[0]
      if (
        droppedFile.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        droppedFile.type === 'application/vnd.ms-powerpoint'
      ) {
        setFile(droppedFile)
        setError(null)
      } else {
        setError('Invalid file type. Please upload a PowerPoint file (.pptx, .ppt).')
      }
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: isProcessing,
  })

  const handleUpload = async () => {
    if (!file) return

    onProcessingStart()
    setError(null)

    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/review/upload-blob',
      })

      // Now, call the review API with the blob URL
      const reviewResponse = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: newBlob.url }),
      })

      if (!reviewResponse.ok) {
        let errorMessage = `Server error: ${reviewResponse.status}`;
        try {
          // Try to parse JSON, but prepare for it to fail
          const errorData = await reviewResponse.json();
          errorMessage = errorData.details || errorData.error || 'An unknown error from the server.';
        } catch (e) {
          // If JSON parsing fails, use the response text as a fallback
          errorMessage = await reviewResponse.text();
        }
        throw new Error(errorMessage);
      }

      const reviewData = await reviewResponse.json()
      onReviewComplete(reviewData.data)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
      // Reset processing state on error
      const anyData: any = null;
      onReviewComplete(anyData);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {!file && (
        <div
          {...getRootProps()}
          className={`w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary-600 bg-primary-50' : 'border-gray-300'}
            ${isProcessing ? 'cursor-not-allowed opacity-50' : 'hover:border-primary-500'}`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-4 text-sm text-gray-600">
            <span className="font-semibold text-primary-600">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">PowerPoint (.pptx, .ppt)</p>
        </div>
      )}

      {file && (
        <div className="w-full p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center space-x-3">
            <FileIcon className="w-6 h-6 text-gray-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            {!isProcessing && (
              <button onClick={() => setFile(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={!file || isProcessing}
        className="mt-4 w-full px-4 py-2 text-white bg-primary-600 rounded-lg shadow-sm
          hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        {isProcessing ? 'Processing...' : 'Start Review'}
      </button>
    </div>
  )
} 