import { useRef } from 'react'
import { useUpload } from '../../hooks/useUpload'

export default function UploadSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload, isUploading, uploadingDocs, clearCompleted } = useUpload()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      upload(file)
      e.target.value = '' // Reset input
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      upload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const processingDocs = uploadingDocs.filter((d) => d.status === 'processing')
  const completedDocs = uploadingDocs.filter((d) => d.status !== 'processing')

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Upload Document</h2>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="mt-2 text-sm text-gray-600">
          {isUploading ? (
            <span className="text-blue-600">Uploading...</span>
          ) : (
            <>
              <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
            </>
          )}
        </p>
        <p className="text-xs text-gray-500 mt-1">PDF, DOCX, or TXT</p>
      </div>

      {/* Processing Documents */}
      {processingDocs.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Processing</h3>
          <div className="space-y-2">
            {processingDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <svg className="animate-spin h-5 w-5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-700">{doc.filename}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Documents */}
      {completedDocs.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Recently Processed</h3>
            <button
              onClick={clearCompleted}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {completedDocs.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  doc.status === 'completed' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                {doc.status === 'completed' ? (
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className="text-sm text-gray-700">{doc.filename}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
