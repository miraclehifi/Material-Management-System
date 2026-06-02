import { useRef } from 'react'

interface DropZoneProps {
  onFiles: (files: File[]) => void
}

export function DropZone({ onFiles }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (files.length) onFiles(files)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
    if (files.length) onFiles(files)
    e.target.value = ''
  }

  return (
    <div
      className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40 transition-colors group"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault() }}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleChange} />
      <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-300 group-hover:text-blue-400 transition-colors mb-2 block" />
      <p className="text-sm font-semibold text-slate-500">点击或拖拽上传</p>
      <span className="text-xs text-slate-400">JPG / PNG / WEBP · 可多选</span>
    </div>
  )
}
