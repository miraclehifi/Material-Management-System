import { useState } from 'react'

interface LogLine {
  id: number
  text: string
  type: 'info' | 'ok' | 'err'
}

interface TableToolbarProps {
  rowCount: number
  syncIndicatorRef: React.RefObject<HTMLSpanElement | null>
  logLines: LogLine[]
  onAddRow: () => void
  onDeleteSelected: () => void
  onRefresh: () => void
  onClear: () => void
  onExport: () => void
}

export function TableToolbar({
  rowCount,
  syncIndicatorRef,
  logLines,
  onAddRow,
  onDeleteSelected,
  onRefresh,
  onClear,
  onExport: _onExport,
}: TableToolbarProps) {
  const [logOpen, setLogOpen] = useState(false)

  return (
    <div className="flex flex-col border-b border-slate-200">
      <div className="flex items-center justify-between px-3 py-2 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAddRow}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <i className="fa-solid fa-plus" /> 新增行
          </button>
          <button
            onClick={onDeleteSelected}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            <i className="fa-solid fa-trash" /> 删除选中
          </button>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <i className="fa-solid fa-rotate" /> 刷新
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors"
          >
            <i className="fa-solid fa-eraser" /> 清空
          </button>
          <span className="text-xs text-slate-400 ml-1">{rowCount} 行</span>
          <span
            ref={syncIndicatorRef}
            className="hidden text-xs text-blue-500 items-center gap-1"
          >
            <i className="fa-solid fa-spinner fa-spin" /> 同步中
          </span>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <i className="fa-solid fa-circle-info" /> 单元格直接点击编辑 · H列自动计算 · 数据实时同步
        </div>
      </div>

      {/* Log bar */}
      <div className="border-t border-slate-100">
        <button
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
          onClick={() => setLogOpen((v) => !v)}
        >
          <i className="fa-solid fa-terminal text-slate-400" /> 识别日志
          {logLines.length > 0 && (
            <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {logLines.length}
            </span>
          )}
          <i
            className={`fa-solid fa-chevron-up ml-auto transition-transform ${logOpen ? '' : 'rotate-180'}`}
          />
        </button>
        {logOpen && (
          <div className="bg-slate-900 text-slate-300 max-h-36 overflow-y-auto font-mono text-[11px] px-3 py-2">
            {logLines.length === 0 ? (
              <span className="text-slate-500">暂无日志</span>
            ) : (
              logLines.map((line) => (
                <div
                  key={line.id}
                  className={line.type === 'ok' ? 'text-green-400' : line.type === 'err' ? 'text-red-400' : 'text-slate-300'}
                >
                  {line.text}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
