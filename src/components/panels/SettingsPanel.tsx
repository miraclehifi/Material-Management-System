import { useState } from 'react'
import type { AppSettings } from '../../types/fabric'
import { getCompMap } from '../../lib/ocr-parser'

interface SettingsPanelProps {
  open: boolean
  settings: AppSettings
  onClose: () => void
  onSave: (s: AppSettings) => void
}

export function SettingsPanel({ open, settings, onClose, onSave }: SettingsPanelProps) {
  const [local, setLocal] = useState<AppSettings>(settings)

  const update = (k: keyof AppSettings, v: string | number) =>
    setLocal((prev) => ({ ...prev, [k]: v }))

  const handleSave = () => {
    onSave(local)
    onClose()
  }

  const compMap = getCompMap()

  return (
    <div
      className={`fixed top-0 right-0 bottom-0 w-80 bg-white shadow-2xl z-[500] flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
          <i className="fa-solid fa-gear text-blue-500" /> 系统设置
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        <section>
          <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">Excel 导出设置</div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">工作表名称</label>
              <input
                type="text"
                value={local.sheetName}
                onChange={(e) => update('sheetName', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">导出文件名前缀</label>
              <input
                type="text"
                value={local.filePrefix}
                onChange={(e) => update('filePrefix', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
        </section>

        <section>
          <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">同步设置</div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">自动刷新间隔（秒）</label>
            <input
              type="number"
              min={5}
              max={60}
              value={local.syncInterval}
              onChange={(e) => update('syncInterval', +e.target.value || 15)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        </section>

        <section>
          <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">图片设置</div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">缩略图最大尺寸（px）</label>
            <input
              type="number"
              min={60}
              max={300}
              value={local.thumbSize}
              onChange={(e) => update('thumbSize', +e.target.value || 120)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">较小值可减少存储压力（建议多人使用时设为80-120）</p>
          </div>
        </section>

        <section>
          <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">成分缩写对照</div>
          <div className="text-[11px] border border-slate-100 rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 bg-slate-50 px-2 py-1.5 font-semibold text-slate-500">
              <span>缩写</span><span>中文</span><span>英文</span>
            </div>
            {compMap.slice(0, 15).map((c, i) => (
              <div key={i} className="grid grid-cols-3 px-2 py-1 border-t border-slate-50 text-slate-600">
                <span className="font-bold text-blue-600">{c.abbr}</span>
                <span>{c.cn}</span>
                <span className="text-slate-400">{c.en}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-floppy-disk" /> 保存设置
        </button>
      </div>
    </div>
  )
}
