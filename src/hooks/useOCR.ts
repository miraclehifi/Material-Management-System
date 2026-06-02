import { useState, useCallback, useRef } from 'react'
import type { FabricRow, ImgQueueItem, OCRProgress, ToastType } from '../types/fabric'
import { parseOCRMulti, inferSequentialCodes } from '../lib/ocr-parser'
import { createRecord, rowToPayload } from '../lib/api'
import { genId, resizeImageToDataURL } from '../lib/utils'

interface UseOCROptions {
  rows: React.MutableRefObject<FabricRow[]>
  addRows: (rows: FabricRow[]) => void
  updateRows: (updater: (rows: FabricRow[]) => FabricRow[]) => void
  sessionId: string
  showToast: (msg: string, type?: ToastType) => void
  getThumbSize: () => number
}

declare const Tesseract: {
  recognize: (
    img: string,
    lang: string,
    opts: { logger: (m: { status: string; progress: number }) => void },
  ) => Promise<{ data: { text: string } }>
}

export function useOCR({
  rows,
  addRows,
  updateRows,
  sessionId,
  showToast,
  getThumbSize,
}: UseOCROptions) {
  const [imgQueue, setImgQueue] = useState<ImgQueueItem[]>([])
  const [ocrProgress, setOcrProgress] = useState<OCRProgress>({ visible: false, pct: 0, text: '' })
  const nextImgId = useRef(0)

  const addFiles = useCallback((files: File[]) => {
    const items: ImgQueueItem[] = files.map((f) => ({
      id: genId('img'),
      file: f,
      url: URL.createObjectURL(f),
      name: f.name,
      status: 'waiting',
      rowIds: [],
      progress: 0,
    }))
    setImgQueue((prev) => [...prev, ...items])
    nextImgId.current++
  }, [])

  const removeImg = useCallback((id: string) => {
    setImgQueue((prev) => {
      const item = prev.find((x) => x.id === id)
      if (item) URL.revokeObjectURL(item.url)
      return prev.filter((x) => x.id !== id)
    })
  }, [])

  const ocrAll = useCallback(
    async (options: { lang: string; factoryKw: string; operator: string }) => {
      const pending = imgQueue.filter((i) => i.status !== 'done')
      if (!pending.length) { showToast('所有图片已识别完毕', 'warning'); return }

      if (options.operator) localStorage.setItem('fabric_operator', options.operator)

      setOcrProgress({ visible: true, pct: 0, text: '准备中...' })

      let totalNewRows = 0
      const allAddedRows: FabricRow[] = []

      for (let i = 0; i < pending.length; i++) {
        const item = pending[i]
        setImgQueue((prev) =>
          prev.map((x) => (x.id === item.id ? { ...x, status: 'running', progress: 0 } : x)),
        )
        setOcrProgress({
          visible: true,
          pct: Math.round((i / pending.length) * 100),
          text: `识别 ${i + 1}/${pending.length}: ${item.name}`,
        })

        try {
          const thumb = await resizeImageToDataURL(item.url, getThumbSize())
          const result = await Tesseract.recognize(item.url, options.lang, {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                setImgQueue((prev) =>
                  prev.map((x) =>
                    x.id === item.id ? { ...x, progress: Math.floor(m.progress * 100) } : x,
                  ),
                )
              }
            },
          })

          const parsedList = parseOCRMulti(result.data.text, { factoryKw: options.factoryKw })
          const now = new Date().toLocaleString('zh-CN')
          const newRows: FabricRow[] = parsedList.map((parsed) => ({
            id: `row_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            colB: parsed.colB,
            colC: parsed.colC,
            colD: parsed.colD,
            colE: parsed.colE,
            colF: parsed.colF,
            colG: parsed.colG,
            colH: parsed.colH,
            colI: parsed.colI,
            ourIdRaw: parsed.ourIdRaw,
            inferred: parsed.inferred,
            notes: parsed.notes,
            imgDataUrl: thumb,
            imgName: item.name,
            ocrRaw: result.data.text,
            sessionId,
            createdAt: now,
            dbId: null,
          }))

          addRows(newRows)
          allAddedRows.push(...newRows)
          totalNewRows += newRows.length

          // Run sequential inference on all rows
          updateRows((prev) => {
            inferSequentialCodes(prev)
            return [...prev]
          })

          setImgQueue((prev) =>
            prev.map((x) =>
              x.id === item.id
                ? { ...x, status: 'done', rowIds: newRows.map((r) => r.id), progress: 100 }
                : x,
            ),
          )

          // Save to DB
          for (const row of newRows) {
            const idx = rows.current.findIndex((r) => r.id === row.id)
            const id = await createRecord(rowToPayload(row, idx, sessionId))
            if (id) {
              updateRows((prev) =>
                prev.map((r) => (r.id === row.id ? { ...r, dbId: id } : r)),
              )
            }
          }
        } catch (e) {
          setImgQueue((prev) =>
            prev.map((x) => (x.id === item.id ? { ...x, status: 'error' } : x)),
          )
          console.warn('OCR error:', e)
        }
      }

      // Final inference pass
      updateRows((prev) => {
        inferSequentialCodes(prev)
        return [...prev]
      })

      setOcrProgress({
        visible: true,
        pct: 100,
        text: `完成！共 ${pending.length} 张图 / ${totalNewRows} 条记录`,
      })
      showToast(`✅ 识别完成：${pending.length} 张图，共 ${totalNewRows} 条记录`, 'success')
    },
    [imgQueue, addRows, updateRows, rows, sessionId, showToast, getThumbSize],
  )

  return { imgQueue, ocrProgress, addFiles, removeImg, ocrAll }
}
