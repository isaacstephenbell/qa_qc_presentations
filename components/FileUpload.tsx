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
  const [textQA, setTextQA] = useState(true)
  const [visionQA, setVisionQA] = useState(false)

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
    if (!textQA && !visionQA) {
      setError('Please select at least one QA check to run.')
      return
    }
    onProcessingStart()
    setError(null)
    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/review/upload-blob',
      })
      let reviewData = {}
      if (textQA && visionQA) {
        // Call both APIs and combine results
        const [textRes, visionRes] = await Promise.all([
          fetch('/api/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: newBlob.url }),
          }),
          fetch('/api/vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileUrl: newBlob.url }),
          })
        ])
        if (!textRes.ok || !visionRes.ok) {
          let errorMessage = 'Server error: ';
          if (!textRes.ok) {
            let errorText = await textRes.text();
            try { const errorData = JSON.parse(errorText); errorMessage += errorData.details || errorData.error; }
            catch { errorMessage += errorText; }
          }
          if (!visionRes.ok) {
            let errorText = await visionRes.text();
            try { const errorData = JSON.parse(errorText); errorMessage += errorData.details || errorData.error; }
            catch { errorMessage += errorText; }
          }
          throw new Error(errorMessage)
        }
        const textData = await textRes.json()
        const visionData = await visionRes.json()
        reviewData = {
          ...(textData && typeof textData === 'object' && 'data' in textData ? textData.data : {}),
          vision: visionData && typeof visionData === 'object' && 'data' in visionData ? visionData.data : visionData
        }
      } else if (textQA) {
        const reviewResponse = await fetch('/api/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: newBlob.url }),
        })
        if (!reviewResponse.ok) {
          let errorMessage = `Server error: ${reviewResponse.status}`;
          let errorText = await reviewResponse.text();
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.details || errorData.error || 'An unknown error from the server.';
          } catch (e) {
            errorMessage = errorText;
          }
          throw new Error(errorMessage);
        }
        const reviewJson = await reviewResponse.json()
        reviewData = reviewJson && typeof reviewJson === 'object' && 'data' in reviewJson ? reviewJson.data : reviewJson
      } else if (visionQA) {
        const visionResponse = await fetch('/api/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: newBlob.url }),
        })
        if (!visionResponse.ok) {
          let errorMessage = `Server error: ${visionResponse.status}`;
          let errorText = await visionResponse.text();
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.details || errorData.error || 'An unknown error from the server.';
          } catch (e) {
            errorMessage = errorText;
          }
          throw new Error(errorMessage);
        }
        const visionJson = await visionResponse.json()
        reviewData = { vision: visionJson && typeof visionJson === 'object' && 'data' in visionJson ? visionJson.data : visionJson }
      }
      onReviewComplete(reviewData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.')
      const anyData: any = null;
      onReviewComplete(anyData);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* QA Checkboxes */}
      <div className="flex flex-row space-x-4 mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={textQA}
            onChange={e => setTextQA(e.target.checked)}
            disabled={isProcessing}
          />
          <span>Text QA</span>
        </label>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={visionQA}
            onChange={e => setVisionQA(e.target.checked)}
            disabled={isProcessing}
          />
          <span>Vision QA</span>
        </label>
      </div>
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