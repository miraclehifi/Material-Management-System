import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import type { FabricRow, AppSettings, LightboxState, DBRecord } from '../types/fabric'
import { loadSettings, saveSettings } from '../lib/config'
import { fetchRecords, dbRecordToRow, createSession } from '../lib/api'
import { dateStr, genSessionId } from '../lib/utils'
import { useToast } from '../hooks/useToast'
import { useSync } from '../hooks/useSync'
import { useOCR } from '../hooks/useOCR'
import { Header } from '../components/Header'
import { OCRPanel } from '../components/ocr/OCRPanel'
import { FabricTable } from '../components/table/FabricTable'
import { TableToolbar } from '../components/table/TableToolbar'
import { HistoryPanel } from '../components/panels/HistoryPanel'
import { SettingsPanel } from '../components/panels/SettingsPanel'
import { Overlay } from '../components/ui/Overlay'
import { Lightbox } from '../components/ui/Lightbox'
import { Toast } from '../components/ui/Toast'

interface LogLine {
  id: number
  text: string
  type: 'info' | 'ok' | 'err'
}

type HeaderStatus = { type: 'idle' | 'running' | 'done' | 'error'; html: string }

export default function DesktopPage() {
  const [rows, setRows] = useState<FabricRow[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)
  const [logLines, setLogLines] = useState<LogLine[]>([])
  const [headerStatus, setHeaderStatus] = useState<HeaderStatus>({
    type: 'idle',
    html: '<i class="fa-solid fa-circle-check"></i> 就绪',
  })
  const [operator, setOperator] = useState(() => localStorage.getItem('fabric_operator') ?? '')

  const nextRowId = useRef(1)
  const sessionId = useRef(genSessionId())
  const rowsRef = useRef<FabricRow[]>(rows)
  const syncIndicatorRef = useRef<HTMLSpanElement | null>(null)
  const logCnt = useRef(0)

  const { toast, showToast } = useToast()

  const addLog = useCallback((text: string, type: 'info' | 'ok' | 'err' = 'info') => {
    const ts = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setLogLines((prev) => {
      const next = [...prev, { id: ++logCnt.current, text: `[${ts}] ${text}`, type }]
      return next.length > 200 ? next.slice(-200) : next
    })
  }, [])

  // Keep rowsRef in sync without causing re-renders
  const setRowsSync = useCallback((updater: React.SetStateAction<FabricRow[]>) => {
    setRows((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      rowsRef.current = next
      return next
    })
  }, [])

  const addRows = useCallback((newRows: FabricRow[]) => {
    setRowsSync((prev) => [...prev, ...newRows])
  }, [setRowsSync])

  const updateRows = useCallback((updater: (rows: FabricRow[]) => FabricRow[]) => {
    setRowsSync((prev) => updater(prev))
  }, [setRowsSync])

  const { onlineCount } = useSync({
    rows,
    setRows: setRowsSync,
    nextRowId,
    showToast,
    intervalSec: settings.syncInterval,
    syncIndicatorRef,
  })

  const { imgQueue, ocrProgress, addFiles, removeImg, ocrAll } = useOCR({
    rows: rowsRef,
    addRows,
    updateRows,
    sessionId: sessionId.current,
    showToast,
    getThumbSize: () => settings.thumbSize,
  })

  const handleOCRAll = useCallback(
    async (options: { lang: string; factoryKw: string; operator: string }) => {
      setHeaderStatus({
        type: 'running',
        html: `<i class="fa-solid fa-spinner fa-spin"></i> 识别中...`,
      })
      await ocrAll(options)

      const label = `${new Date().toLocaleString('zh-CN')} · ${options.operator || '未知'}`
      await createSession({
        session_id: sessionId.current,
        session_label: label,
        operator: options.operator || '未知',
        row_count: rowsRef.current.length,
        created_at_custom: new Date().toLocaleString('zh-CN'),
      }).catch(() => {})

      setHeaderStatus({
        type: 'done',
        html: `<i class="fa-solid fa-circle-check"></i> 识别完成`,
      })
      addLog(`识别完成，共 ${rowsRef.current.length} 条记录`, 'ok')
    },
    [ocrAll, addLog],
  )

  const handleLoadFromDB = useCallback(async () => {
    setHeaderStatus({ type: 'running', html: '<i class="fa-solid fa-spinner fa-spin"></i> 加载...' })
    try {
      const records = await fetchRecords()
      const localDbIds = new Set(rowsRef.current.map((r) => r.dbId).filter(Boolean))
      const newRecords = records.filter((r) => !localDbIds.has(r.id))
      if (newRecords.length > 0) {
        const newRows = newRecords.map((r) =>
          dbRecordToRow(r, `row_${nextRowId.current++}`),
        )
        addRows(newRows)
        showToast(`已加载 ${newRecords.length} 条记录`, 'success')
      }
      setHeaderStatus({ type: 'done', html: `<i class="fa-solid fa-circle-check"></i> ${records.length} 条` })
    } catch {
      setHeaderStatus({ type: 'error', html: '加载失败' })
    }
  }, [addRows, showToast])

  const handleAddRow = useCallback(() => {
    const id = `row_${nextRowId.current++}`
    const now = new Date().toLocaleString('zh-CN')
    const emptyRow: FabricRow = {
      id, colB: '', colC: '', colD: '', colE: '', colF: '', colG: '', colH: '', colI: '',
      ourIdRaw: '', inferred: false, notes: [], imgDataUrl: '', imgName: '', ocrRaw: '',
      sessionId: sessionId.current, createdAt: now, dbId: null,
    }
    addRows([emptyRow])
  }, [addRows])

  const handleUpdate = useCallback((id: string, updates: Partial<FabricRow>) => {
    setRowsSync((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }, [setRowsSync])

  const handleUpdateDbId = useCallback((id: string, dbId: string) => {
    setRowsSync((prev) => prev.map((r) => (r.id === id ? { ...r, dbId } : r)))
  }, [setRowsSync])

  const handleRemove = useCallback(
    async (id: string) => {
      const row = rowsRef.current.find((r) => r.id === id)
      if (row?.dbId) {
        await fetch(`tables/fabric_records/${row.dbId}`, { method: 'DELETE' }).catch(() => {})
      }
      setRowsSync((prev) => prev.filter((r) => r.id !== id))
      setCheckedIds((prev) => { const s = new Set(prev); s.delete(id); return s })
    },
    [setRowsSync],
  )

  const handleDeleteSelected = useCallback(async () => {
    if (!checkedIds.size) { showToast('未选中任何行', 'warning'); return }
    if (!confirm(`删除选中的 ${checkedIds.size} 行？`)) return
    for (const id of checkedIds) await handleRemove(id)
    setCheckedIds(new Set())
  }, [checkedIds, handleRemove, showToast])

  const handleClearAll = useCallback(async () => {
    if (!rowsRef.current.length) { showToast('表格已空', 'warning'); return }
    if (!confirm(`清空全部 ${rowsRef.current.length} 行？`)) return
    for (const row of rowsRef.current) {
      if (row.dbId) await fetch(`tables/fabric_records/${row.dbId}`, { method: 'DELETE' }).catch(() => {})
    }
    setRowsSync([])
    setCheckedIds(new Set())
    showToast('已清空', 'success')
  }, [setRowsSync, showToast])

  const handleExport = useCallback(() => {
    if (!rowsRef.current.length) { showToast('表格为空', 'warning'); return }
    const headers = ['面料描述', '编号(HLWG/HLFG)', '成分(Content)', '规格(Density)', '克重(g/m²)', '幅宽(M)', '幅宽(英寸)', '工厂批号']
    const data = rowsRef.current.map((r) => [r.colB, r.colC, r.colD, r.colE, r.colF, r.colG, r.colH, r.colI])
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 32 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 24 }]
    XLSX.utils.book_append_sheet(wb, ws, settings.sheetName)
    XLSX.writeFile(wb, `${settings.filePrefix}_${dateStr()}.xlsx`)
    showToast(`✅ 已导出 ${rowsRef.current.length} 行`, 'success')
  }, [settings, showToast])

  const handleLoadSession = useCallback((records: DBRecord[]) => {
    const newRows = records.map((r) => dbRecordToRow(r, `row_${nextRowId.current++}`))
    setRowsSync(newRows)
    setCheckedIds(new Set())
    showToast(`✅ 已载入 ${newRows.length} 条历史记录`, 'success')
  }, [setRowsSync, showToast])

  const handleSaveSettings = useCallback((s: AppSettings) => {
    saveSettings(s)
    setSettings(s)
    showToast('✅ 设置已保存', 'success')
  }, [showToast])

  const closeAll = () => { setHistoryOpen(false); setSettingsOpen(false) }
  const anyPanelOpen = historyOpen || settingsOpen

  const allChecked = rows.length > 0 && checkedIds.size === rows.length

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-['Noto_Sans_SC',sans-serif]">
      <Header
        status={headerStatus}
        onlineCount={onlineCount}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onExport={handleExport}
      />

      <div className="flex flex-1 overflow-hidden">
        <OCRPanel
          imgQueue={imgQueue}
          ocrProgress={ocrProgress}
          operator={operator}
          onOperatorChange={setOperator}
          onFiles={addFiles}
          onRemoveImg={removeImg}
          onOCRAll={handleOCRAll}
          onShowLightbox={(src, name) => setLightbox({ src, name })}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-white border border-slate-200 m-2 rounded-xl shadow-sm">
          <TableToolbar
            rowCount={rows.length}
            syncIndicatorRef={syncIndicatorRef}
            logLines={logLines}
            onAddRow={handleAddRow}
            onDeleteSelected={handleDeleteSelected}
            onRefresh={handleLoadFromDB}
            onClear={handleClearAll}
            onExport={handleExport}
          />
          <FabricTable
            rows={rows}
            checkedIds={checkedIds}
            allChecked={allChecked}
            onCheckRow={(id, c) =>
              setCheckedIds((prev) => { const s = new Set(prev); c ? s.add(id) : s.delete(id); return s })
            }
            onCheckAll={(c) => setCheckedIds(c ? new Set(rows.map((r) => r.id)) : new Set())}
            onUpdate={handleUpdate}
            onUpdateDbId={handleUpdateDbId}
            onRemove={handleRemove}
            onShowLightbox={(src, name) => setLightbox({ src, name })}
            sessionId={sessionId.current}
          />
        </main>
      </div>

      <Overlay visible={anyPanelOpen} onClick={closeAll} />
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoadSession={handleLoadSession}
        onShowLightbox={setLightbox}
      />
      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
      <Lightbox lightbox={lightbox} onClose={() => setLightbox(null)} />
      <Toast toast={toast} />
    </div>
  )
}
