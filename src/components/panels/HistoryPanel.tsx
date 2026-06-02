import { useState, useEffect, useCallback } from 'react'
import type { HistorySession, DBRecord, LightboxState } from '../../types/fabric'
import { fetchSessions, fetchRecords } from '../../lib/api'

interface HistoryPanelProps {
  open: boolean
  onClose: () => void
  onLoadSession: (rows: DBRecord[]) => void
  onShowLightbox: (state: LightboxState) => void
}

export function HistoryPanel({ open, onClose, onLoadSession, onShowLightbox }: HistoryPanelProps) {
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Record<string, DBRecord[]>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await fetchSessions()
      setSessions([...data].reverse())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const toggleDetail = async (session: HistorySession) => {
    const sid = session.session_id
    if (openId === sid) { setOpenId(null); return }
    setOpenId(sid)
    if (detail[sid]) return
    try {
      const all = await fetchRecords(200)
      setDetail((prev) => ({ ...prev, [sid]: all.filter((r) => r.session_id === sid) }))
    } catch {
      setDetail((prev) => ({ ...prev, [sid]: [] }))
    }
  }

  const handleLoad = async (sessionId: string) => {
    if (!confirm('将此历史批次载入表格？当前表格数据将被清空。')) return
    onClose()
    try {
      const all = await fetchRecords(200)
      onLoadSession(all.filter((r) => r.session_id === sessionId))
    } catch {
      /* silent */
    }
  }

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 w-80 bg-white shadow-2xl z-[500] flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
          <i className="fa-solid fa-clock-rotate-left text-blue-500" /> 历史录入记录
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
            <i className="fa-solid fa-spinner fa-spin mr-2" /> 加载中...
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-24 text-red-400 text-sm">
            加载失败，请重试
          </div>
        )}
        {!loading && !error && sessions.length === 0 && (
          <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
            暂无历史记录
          </div>
        )}
        {sessions.map((s, i) => {
          const sid = s.session_id
          const isOpen = openId === sid
          const rows = detail[sid]
          return (
            <div key={i} className="border-b border-slate-100">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                onClick={() => toggleDetail(s)}
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-box-archive text-blue-500 text-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-700 truncate">
                    {s.session_label || s.created_at_custom || '未知时间'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    <i className="fa-solid fa-user mr-1" />{s.operator || '未知'}
                    &nbsp;·&nbsp;
                    <i className="fa-solid fa-file-lines mr-1" />{s.row_count || 0} 条
                  </div>
                </div>
                <i className={`fa-solid fa-chevron-right text-slate-300 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-3">
                  {!rows ? (
                    <div className="text-xs text-slate-400 py-2">
                      <i className="fa-solid fa-spinner fa-spin mr-1" /> 加载记录...
                    </div>
                  ) : rows.length === 0 ? (
                    <div className="text-xs text-slate-400 py-2">该批次暂无记录</div>
                  ) : (
                    <>
                      {rows.filter((r) => r.img_data_url).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {rows.filter((r) => r.img_data_url).map((r, j) => (
                            <button
                              key={j}
                              onClick={() => onShowLightbox({ src: r.img_data_url, name: r.img_name || '' })}
                              className="w-12 h-12 rounded overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                            >
                              <img src={r.img_data_url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-600 space-y-1 mb-2">
                        {rows.slice(0, 5).map((r, j) => (
                          <div key={j} className="flex gap-2 bg-slate-50 rounded px-2 py-1">
                            <span className="text-blue-600 font-mono">{r.col_c || '—'}</span>
                            <span className="truncate text-slate-400">{(r.col_d || '').slice(0, 18)}</span>
                          </div>
                        ))}
                        {rows.length > 5 && (
                          <div className="text-slate-400 text-center py-1">
                            ...共 {rows.length} 条
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleLoad(sid)}
                        className="w-full py-1.5 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <i className="fa-solid fa-rotate" /> 载入此批次
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
