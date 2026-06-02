import { useState } from 'react'
import type { ImgQueueItem, OCRProgress } from '../../types/fabric'
import { DropZone } from './DropZone'
import { ImageQueue } from './ImageQueue'

interface OCRPanelProps {
  imgQueue: ImgQueueItem[]
  ocrProgress: OCRProgress
  operator: string
  onOperatorChange: (v: string) => void
  onFiles: (files: File[]) => void
  onRemoveImg: (id: string) => void
  onOCRAll: (options: { lang: string; factoryKw: string; operator: string }) => void
  onShowLightbox: (src: string, name: string) => void
}

export function OCRPanel({
  imgQueue,
  ocrProgress,
  operator,
  onOperatorChange,
  onFiles,
  onRemoveImg,
  onOCRAll,
  onShowLightbox,
}: OCRPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [lang, setLang] = useState('chi_sim+eng')
  const [factoryKw, setFactoryKw] = useState('纺织\n织造\n面料\nTextile\n有限公司')
  const pendingCount = imgQueue.filter((i) => i.status !== 'done').length

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col bg-white border-r border-slate-200 h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <i className="fa-solid fa-images text-blue-500" /> 图片队列
        </span>
        {imgQueue.length > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
            {imgQueue.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        <DropZone onFiles={onFiles} />
        <ImageQueue items={imgQueue} onRemove={onRemoveImg} onShowLightbox={onShowLightbox} />

        {/* OCR Settings */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
            onClick={() => setSettingsOpen((v) => !v)}
          >
            <span className="flex items-center gap-1.5">
              <i className="fa-solid fa-sliders" /> 识别设置
            </span>
            <i className={`fa-solid fa-chevron-down transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
          </button>
          {settingsOpen && (
            <div className="p-3 flex flex-col gap-2 text-xs">
              <label className="font-semibold text-slate-500">操作人</label>
              <input
                type="text"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="请输入姓名"
                value={operator}
                onChange={(e) => onOperatorChange(e.target.value)}
              />
              <label className="font-semibold text-slate-500">OCR 语言</label>
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                <option value="chi_sim+eng">中文+英文</option>
                <option value="eng">仅英文</option>
              </select>
              <label className="font-semibold text-slate-500">工厂名关键词（每行一个）</label>
              <textarea
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                rows={4}
                value={factoryKw}
                onChange={(e) => setFactoryKw(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 flex flex-col gap-2">
        <button
          disabled={pendingCount === 0}
          onClick={() => onOCRAll({ lang, factoryKw, operator })}
          className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <i className="fa-solid fa-wand-magic-sparkles" /> 全部识别 → 填入表格
        </button>
        {ocrProgress.visible && (
          <div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${ocrProgress.pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 text-center">{ocrProgress.text}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
