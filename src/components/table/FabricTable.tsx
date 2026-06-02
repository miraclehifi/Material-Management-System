import type { FabricRow } from '../../types/fabric'
import { FabricTableRow } from './FabricRow'

interface FabricTableProps {
  rows: FabricRow[]
  checkedIds: Set<string>
  allChecked: boolean
  onCheckRow: (id: string, checked: boolean) => void
  onCheckAll: (checked: boolean) => void
  onUpdate: (id: string, updates: Partial<FabricRow>) => void
  onUpdateDbId: (id: string, dbId: string) => void
  onRemove: (id: string) => void
  onShowLightbox: (src: string, name: string) => void
  sessionId: string
}

export function FabricTable({
  rows,
  checkedIds,
  allChecked,
  onCheckRow,
  onCheckAll,
  onUpdate,
  onUpdateDbId,
  onRemove,
  onShowLightbox,
  sessionId,
}: FabricTableProps) {
  return (
    <div className="flex-1 overflow-auto">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
          <i className="fa-solid fa-table text-5xl" />
          <p className="text-sm text-center text-slate-400">
            上传图片并点击「全部识别」自动填表
            <br />
            或点击「新增行」手动录入
          </p>
        </div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
            <tr className="border-b border-slate-200">
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => onCheckAll(e.target.checked)}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="w-12 px-1 py-2 text-xs font-semibold text-slate-500">图</th>
              <th className="w-8 px-1 py-2 text-xs font-semibold text-slate-500">#</th>
              <th className="px-1 py-2 text-xs font-semibold text-slate-500">B 面料描述</th>
              <th className="px-1 py-2 text-xs font-semibold text-slate-500">C 编号</th>
              <th className="px-1 py-2 text-xs font-semibold text-slate-500">D 成分 Content</th>
              <th className="px-1 py-2 text-xs font-semibold text-slate-500">E 规格 Density</th>
              <th className="px-1 py-2 text-xs font-semibold text-slate-500">F 克重</th>
              <th className="px-1 py-2 text-xs font-semibold text-slate-500">G 幅宽(M)</th>
              <th className="px-1 py-2 text-xs font-semibold text-slate-400">
                <i className="fa-solid fa-lock text-[9px] mr-0.5" />H 幅宽(英寸)
              </th>
              <th className="px-1 py-2 text-xs font-semibold text-slate-500">I 工厂批号</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <FabricTableRow
                key={row.id}
                row={row}
                index={idx}
                checked={checkedIds.has(row.id)}
                onCheck={onCheckRow}
                onUpdate={onUpdate}
                onUpdateDbId={onUpdateDbId}
                onRemove={onRemove}
                onShowLightbox={onShowLightbox}
                sessionId={sessionId}
                rowCount={rows.length}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
