import type { ImgQueueItem } from '../../types/fabric'

interface ImageQueueProps {
  items: ImgQueueItem[]
  onRemove: (id: string) => void
  onShowLightbox: (src: string, name: string) => void
}

const statusMeta = {
  waiting: { cls: '', icon: 'fa-clock', text: '等待识别', textCls: 'text-slate-400' },
  running: { cls: 'border-blue-300 bg-blue-50', icon: 'fa-spinner fa-spin', text: '识别中...', textCls: 'text-blue-500' },
  done: { cls: 'border-green-200 bg-green-50', icon: 'fa-circle-check', text: '已完成', textCls: 'text-green-600' },
  error: { cls: 'border-red-200 bg-red-50', icon: 'fa-triangle-exclamation', text: '失败', textCls: 'text-red-500' },
}

export function ImageQueue({ items, onRemove, onShowLightbox }: ImageQueueProps) {
  if (!items.length) return null

  return (
    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
      {items.map((item) => {
        const meta = statusMeta[item.status]
        return (
          <div
            key={item.id}
            className={`flex items-center gap-2 border rounded-lg p-1.5 text-xs relative ${meta.cls || 'border-slate-200 bg-white'}`}
          >
            <img
              src={item.url}
              alt={item.name}
              className="w-10 h-10 object-cover rounded cursor-pointer flex-shrink-0"
              onClick={() => onShowLightbox(item.url, item.name)}
            />
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium text-slate-700">{item.name}</div>
              <div className={`flex items-center gap-1 ${meta.textCls}`}>
                <i className={`fa-solid ${meta.icon}`} />
                <span>{meta.text}</span>
              </div>
              {item.status === 'running' && (
                <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </div>
            <button
              className="flex-shrink-0 w-5 h-5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
              onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
            >
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
