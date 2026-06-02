interface HeaderProps {
  status: { type: 'idle' | 'running' | 'done' | 'error'; html: string }
  onlineCount: number
  onOpenHistory: () => void
  onOpenSettings: () => void
  onExport: () => void
}

const statusCls = {
  idle: 'text-slate-400',
  running: 'text-blue-500',
  done: 'text-green-600',
  error: 'text-red-500',
}

export function Header({
  status,
  onlineCount,
  onOpenHistory,
  onOpenSettings,
  onExport,
}: HeaderProps) {
  return (
    <header className="h-14 bg-gradient-to-r from-slate-900 to-blue-900 flex items-center flex-shrink-0 gap-4 px-4 text-white shadow-lg">
      <div className="flex items-center gap-2">
        <i className="fa-solid fa-layer-group text-lg text-blue-400" />
        <div>
          <div className="text-sm font-bold leading-tight">一分三科面料组</div>
          <div className="text-[10px] text-blue-300 leading-tight">智能录入系统</div>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4">
        <span
          className={`text-xs flex items-center gap-1 ${statusCls[status.type]}`}
          dangerouslySetInnerHTML={{ __html: status.html }}
        />
        <span className="text-xs text-slate-400 flex items-center gap-1 border border-slate-700 rounded-full px-2 py-0.5">
          <i className="fa-solid fa-users" /> {onlineCount}
        </span>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <a
          href="/mobile"
          target="_blank"
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <i className="fa-solid fa-mobile-screen" />
          <span className="sm:inline hidden">手机录入</span>
        </a>
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <i className="fa-solid fa-clock-rotate-left" />
          <span className="sm:inline hidden">历史</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <i className="fa-solid fa-gear" />
          <span className="sm:inline hidden">设置</span>
        </button>
        <div className="bg-slate-700 w-px h-4 mx-1" />
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <i className="fa-solid fa-file-excel" /> 导出 Excel
        </button>
      </div>
    </header>
  )
}
