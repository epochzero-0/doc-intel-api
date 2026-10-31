import { useRef, useState } from 'react'
import { ACCEPTED, useUpload } from '../../hooks/useUpload'

export default function UploadSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { upload, isUploading, uploadingName } = useUpload()

  const take = (files: FileList | null | undefined) => {
    const file = files?.[0]
    if (file) upload(file)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        take(e.dataTransfer.files)
      }}
      className={`rounded border border-dashed px-4 py-5 text-center transition-colors ${
        dragging ? 'border-ink bg-hl-soft' : 'border-edge'
      }`}
    >
      <input
        ref={fileInputRef}
        id="upload-input"
        type="file"
        accept={ACCEPTED.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
      {isUploading ? (
        <p role="status" className="grid gap-1 text-sm">
          <span className="font-medium">Uploading</span>
          <span className="truncate font-mono text-xs text-muted">{uploadingName}</span>
        </p>
      ) : (
        <div className="grid justify-items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded text-sm font-medium underline decoration-edge underline-offset-4 hover:decoration-ink"
          >
            Choose a file
          </button>
          <p className="text-xs text-muted">or drop it here. PDF, DOCX or TXT.</p>
        </div>
      )}
    </div>
  )
}
