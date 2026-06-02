import { useState, useRef, useCallback } from 'react'
import type { ToastState } from '../types/fabric'
import { parseOCRFull } from '../lib/ocr-parser'
import { resolveHLCode } from '../lib/ocr-parser'
import { calcInchDisplay, resizeImageToDataURL } from '../lib/utils'

declare const Tesseract: {
  recognize: (
    img: string,
    lang: string,
    opts: { logger: (m: { status: string; progress: number }) => void },
  ) => Promise<{ data: { text: string } }>
}

interface FieldState {
  colB: string; colC: string; colD: string; colE: string
  colF: string; colG: string; colH: string; colI: string
}

const EMPTY_FIELDS: FieldState = {
  colB: '', colC: '', colD: '', colE: '', colF: '', colG: '', colH: '', colI: '',
}

type FieldKey = keyof FieldState

export default function MobilePage() {
  const [fields, setFields] = useState<FieldState>(EMPTY_FIELDS)
  const [highlighted, setHighlighted] = useState<Set<FieldKey>>(new Set())
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [rawText, setRawText] = useState('')
  const [rawVisible, setRawVisible] = useState(false)
  const [operator, setOperator] = useState(() => localStorage.getItem('mob_operator') ?? '')
  const [status, setStatus] = useState('就绪，等待上传图片')
  const [progress, setProgress] = useState<{ pct: number; text: string } | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'default', visible: false })

  const fileRef = useRef<HTMLInputElement>(null)
  const libRef = useRef<HTMLInputElement>(null)
  const currentThumb = useRef('')
  const currentFile = useRef<File | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, type: ToastState['type'] = 'default') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type, visible: true })
    toastTimer.current = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3000)
  }, [])

  const applyParsed = useCallback((raw: string) => {
    const parsed = parseOCRFull(raw, { factoryKw: '纺织\n织造\n面料\nTextile\n有限公司' })
    const hi = new Set<FieldKey>()
    const updates: Partial<FieldState> = {}

    const map: Array<[FieldKey, string]> = [
      ['colB', parsed.colB], ['colC', parsed.colC], ['colD', parsed.colD],
      ['colE', parsed.colE], ['colF', parsed.colF], ['colG', parsed.colG], ['colI', parsed.colI],
    ]
    for (const [key, val] of map) {
      if (val) { updates[key] = val; hi.add(key) }
    }
    if (updates.colG) {
      const m = parseFloat(updates.colG)
      updates.colH = !isNaN(m) && m > 0 ? calcInchDisplay(m) : ''
    }
    setFields((prev) => ({ ...prev, ...updates }))
    setHighlighted(hi)
  }, [])

  const handleFile = useCallback(async (f: File) => {
    currentFile.current = f
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(f))
    setFields(EMPTY_FIELDS)
    setHighlighted(new Set())
    setStatus('就绪，可开始识别')
    setProgress(null)
  }, [previewUrl])

  const handleOCR = useCallback(async () => {
    if (!previewUrl) { showToast('请先选择图片', 'warning'); return }
    setOcrLoading(true)
    setStatus('<i class="fa-solid fa-spinner fa-spin"></i> 识别中...')
    setProgress({ pct: 0, text: '准备中...' })

    currentThumb.current = await resizeImageToDataURL(previewUrl, 120)

    try {
      const result = await Tesseract.recognize(previewUrl, 'chi_sim+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress({ pct: 10 + Math.floor(m.progress * 85), text: `识别中 ${Math.floor(m.progress * 100)}%` })
          }
        },
      })
      setProgress({ pct: 100, text: '识别完成' })
      setRawText(result.data.text)
      setRawVisible(true)
      applyParsed(result.data.text)
      setStatus('<i class="fa-solid fa-circle-check"></i> 识别完成，请检查并保存')
      showToast('识别完成，已填充表单', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知错误'
      setStatus(`识别失败: ${msg}`)
      showToast('识别失败', 'error')
    } finally {
      setOcrLoading(false)
    }
  }, [previewUrl, applyParsed, showToast])

  const handleSave = useCallback(async () => {
    if (!fields.colC) { showToast('请填写编号', 'warning'); return }
    if (operator) localStorage.setItem('mob_operator', operator)
    const payload = {
      session_id: `mob_${Date.now()}`,
      session_time: new Date().toLocaleString('zh-CN'),
      row_index: 0,
      img_data_url: currentThumb.current,
      img_name: currentFile.current?.name ?? '',
      col_b: fields.colB, col_c: fields.colC, col_d: fields.colD, col_e: fields.colE,
      col_f: fields.colF, col_g: fields.colG, col_h: fields.colH, col_i: fields.colI,
      ocr_raw: rawText.slice(0, 3000),
      created_at_custom: new Date().toLocaleString('zh-CN'),
    }
    setStatus('<i class="fa-solid fa-spinner fa-spin"></i> 保存中...')
    try {
      const res = await fetch('tables/fabric_records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      showToast('✅ 保存成功，已同步到电脑端', 'success')
      setStatus('<i class="fa-solid fa-circle-check"></i> 已保存并同步')
      handleClear()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '未知'
      setStatus('保存失败')
      showToast(`保存失败: ${msg}`, 'error')
    }
  }, [fields, operator, rawText, showToast])

  const handleClear = useCallback(() => {
    setFields(EMPTY_FIELDS)
    setHighlighted(new Set())
    setRawText('')
    setRawVisible(false)
    setPreviewUrl(null)
    setProgress(null)
    currentThumb.current = ''
    currentFile.current = null
    setStatus('已清空，等待新图片')
  }, [])

  const updateField = (key: FieldKey, val: string) => {
    let processed = val
    if (key === 'colC') {
      const m = val.match(/^([15]\d{4})$/)
      if (m) processed = resolveHLCode(m[1])
    }
    const updates: Partial<FieldState> = { [key]: processed }
    if (key === 'colG') {
      const m = parseFloat(val)
      updates.colH = !isNaN(m) && m > 0 ? calcInchDisplay(m) : ''
    }
    setFields((prev) => ({ ...prev, ...updates }))
    setHighlighted((prev) => { const s = new Set(prev); s.delete(key); return s })
  }

  const toastCls = { default: 'bg-slate-800', success: 'bg-green-700', warning: 'bg-amber-700', error: 'bg-red-700' }

  return (
    <div className="min-h-screen bg-slate-100 pb-24 font-['Noto_Sans_SC',sans-serif]">
      {/* Tesseract CDN */}
      <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js" async />

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-600 text-white px-4 py-3 sticky top-0 z-10 shadow-lg">
        <div className="font-bold text-sm">一分三科面料组</div>
        <div className="text-xs opacity-75 mt-0.5">手机录入端 · 实时同步到电脑</div>
        <div
          className="text-xs opacity-80 mt-1"
          dangerouslySetInnerHTML={{ __html: status }}
        />
      </header>

      {/* Sync banner */}
      <div className="mx-3 mt-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
        <i className="fa-solid fa-rotate" />
        数据自动同步到电脑端 ·
        <a href="/" className="font-bold hover:underline">
          打开电脑端 <i className="fa-solid fa-arrow-up-right-from-square" />
        </a>
      </div>

      {/* Upload section */}
      <div className="mx-3 mt-3 bg-white rounded-xl p-4 shadow-sm">
        <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2">
          <i className="fa-solid fa-camera text-blue-500" /> 拍照 / 上传图片
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <input ref={libRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 active:bg-blue-700"
          >
            <i className="fa-solid fa-camera" /> 拍照
          </button>
          <button
            onClick={() => libRef.current?.click()}
            className="py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-200 active:bg-slate-200"
          >
            <i className="fa-solid fa-images" /> 相册选择
          </button>
        </div>

        {previewUrl && (
          <>
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-2">
              <img src={previewUrl} alt="预览" className="w-full max-h-64 object-contain bg-slate-50" />
            </div>
            <button
              onClick={handleOCR}
              disabled={ocrLoading}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 mb-2"
            >
              <i className="fa-solid fa-wand-magic-sparkles" /> OCR 自动识别
            </button>
            {progress && (
              <div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-blue-500 transition-all rounded-full" style={{ width: `${progress.pct}%` }} />
                </div>
                <p className="text-xs text-slate-400 text-center">{progress.text}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Raw text */}
      {rawVisible && (
        <div className="mx-3 mt-3 bg-white rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-file-lines text-blue-500" /> OCR 原始文本
            </span>
            <button
              onClick={() => applyParsed(rawText)}
              className="text-xs border border-slate-200 text-slate-500 px-2 py-1 rounded-lg"
            >
              重新解析
            </button>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono min-h-20 resize-none"
          />
        </div>
      )}

      {/* Operator */}
      <div className="mx-3 mt-3 bg-white rounded-xl p-4 shadow-sm">
        <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-2">
          <i className="fa-solid fa-user text-blue-500" /> 操作人
        </div>
        <input
          type="text"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          placeholder="请输入您的姓名"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Form fields */}
      <div className="mx-3 mt-3 bg-white rounded-xl p-4 shadow-sm">
        <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2">
          <i className="fa-solid fa-table-cells text-blue-500" /> 面料信息
        </div>
        <div className="flex flex-col gap-3">
          {(
            [
              { key: 'colB' as FieldKey, label: '面料描述', col: 'B', placeholder: '品名、颜色、花型' },
              { key: 'colC' as FieldKey, label: '编号', col: 'C', placeholder: '输入5位数字自动生成编号' },
              { key: 'colD' as FieldKey, label: '成分 Content', col: 'D', placeholder: '如：60% Cotton 40% Polyester' },
              { key: 'colE' as FieldKey, label: '规格 Density', col: 'E', placeholder: '如：32S×32S' },
              { key: 'colF' as FieldKey, label: '克重 g/m²', col: 'F', placeholder: '如：180' },
              { key: 'colG' as FieldKey, label: '幅宽 M', col: 'G', placeholder: '如：1.60' },
            ] as const
          ).map(({ key, label, col, placeholder }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-500">{label}</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">{col}列</span>
              </div>
              <input
                type="text"
                value={fields[key]}
                placeholder={placeholder}
                onChange={(e) => updateField(key, e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 ${highlighted.has(key) ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`}
              />
            </div>
          ))}

          {/* H col - readonly */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                幅宽 英寸 <i className="fa-solid fa-lock text-slate-300 text-[10px]" />
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">H列</span>
            </div>
            <input
              type="text"
              value={fields.colH}
              readOnly
              placeholder="自动计算"
              className="w-full border border-slate-100 rounded-xl px-3 py-2.5 text-sm bg-slate-50 text-slate-400"
            />
          </div>

          {/* I col */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500">工厂批号</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">I列</span>
            </div>
            <input
              type="text"
              value={fields.colI}
              placeholder="如：天强TM0815-198159"
              onChange={(e) => updateField('colI', e.target.value)}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 ${highlighted.has('colI') ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}`}
            />
          </div>
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex gap-2 shadow-lg z-20">
        <button
          onClick={handleClear}
          className="py-3.5 px-4 bg-slate-100 text-slate-500 text-sm font-semibold rounded-xl border border-slate-200 active:bg-slate-200"
        >
          <i className="fa-solid fa-eraser" />
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 active:bg-blue-700"
        >
          <i className="fa-solid fa-floppy-disk" /> 保存并同步
        </button>
      </div>

      {/* Toast */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-lg text-white text-sm font-medium z-[9999] whitespace-nowrap transition-all duration-300 ${toastCls[toast.type]} ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      >
        {toast.message}
      </div>
    </div>
  )
}
