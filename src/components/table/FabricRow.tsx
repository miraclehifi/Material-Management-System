import { useState, useEffect, useCallback, useRef, memo } from 'react'
import type { FabricRow } from '../../types/fabric'
import { calcInchDisplay } from '../../lib/utils'
import { resolveHLCode } from '../../lib/ocr-parser'
import { createRecord, updateRecord, rowToPayload } from '../../lib/api'

interface FabricRowProps {
  row: FabricRow
  index: number
  checked: boolean
  onCheck: (id: string, checked: boolean) => void
  onUpdate: (id: string, updates: Partial<FabricRow>) => void
  onUpdateDbId: (id: string, dbId: string) => void
  onRemove: (id: string) => void
  onShowLightbox: (src: string, name: string) => void
  sessionId: string
  rowCount: number
}

type CellKey = 'colB' | 'colC' | 'colD' | 'colE' | 'colF' | 'colG' | 'colI'

const COLS: Array<{ key: CellKey; placeholder: string; cls: string }> = [
  { key: 'colB', placeholder: '面料描述', cls: 'w-36' },
  { key: 'colC', placeholder: 'HLWG/HLFG编号', cls: 'w-28' },
  { key: 'colD', placeholder: '成分Content', cls: 'w-48' },
  { key: 'colE', placeholder: '规格Density', cls: 'w-28' },
  { key: 'colF', placeholder: '克重', cls: 'w-16' },
  { key: 'colG', placeholder: '幅宽(M)', cls: 'w-20' },
  { key: 'colI', placeholder: '工厂批号', cls: 'w-36' },
]

export const FabricTableRow = memo(function FabricTableRow({
  row,
  index,
  checked,
  onCheck,
  onUpdate,
  onUpdateDbId,
  onRemove,
  onShowLightbox,
  sessionId,
  rowCount: _rowCount,
}: FabricRowProps) {
  const [cells, setCells] = useState({
    colB: row.colB, colC: row.colC, colD: row.colD,
    colE: row.colE, colF: row.colF, colG: row.colG,
    colH: row.colH, colI: row.colI,
  })

  const trRef = useRef<HTMLTableRowElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync from external changes (sync) only if this row is not focused
  useEffect(() => {
    if (trRef.current?.contains(document.activeElement)) return
    setCells({
      colB: row.colB, colC: row.colC, colD: row.colD,
      colE: row.colE, colF: row.colF, colG: row.colG,
      colH: row.colH, colI: row.colI,
    })
  }, [row.colB, row.colC, row.colD, row.colE, row.colF, row.colG, row.colH, row.colI])

  const scheduleSave = useCallback(
    (updates: Partial<FabricRow>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        onUpdate(row.id, updates)
        const merged = { ...row, ...updates }
        const payload = rowToPayload(merged, index, sessionId)
        try {
          if (row.dbId) {
            await updateRecord(row.dbId, payload)
          } else {
            const id = await createRecord(payload)
            if (id) onUpdateDbId(row.id, id)
          }
        } catch {
          /* silent */
        }
      }, 600)
    },
    [row, index, sessionId, onUpdate, onUpdateDbId],
  )

  const handleChange = useCallback(
    (key: CellKey, value: string) => {
      let processed = value
      const updates: Partial<FabricRow> = { [key]: processed }

      if (key === 'colC') {
        const m = value.match(/^([15]\d{4})$/)
        if (m) { processed = resolveHLCode(m[1]); updates.colC = processed }
      }
      if (key === 'colG') {
        const m = parseFloat(value)
        const hv = !isNaN(m) && m > 0 ? calcInchDisplay(m) : ''
        updates.colH = hv
        setCells((prev) => ({ ...prev, [key]: processed, colH: hv }))
        scheduleSave(updates)
        return
      }

      setCells((prev) => ({ ...prev, [key]: processed }))
      scheduleSave(updates)
    },
    [scheduleSave],
  )

  const isInferred = row.inferred && row.colC

  return (
    <tr ref={trRef} id={`tr_${row.id}`} className="hover:bg-slate-50 group">
      {/* Checkbox */}
      <td className="w-8 px-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(row.id, e.target.checked)}
          className="rounded border-slate-300"
        />
      </td>

      {/* Image */}
      <td className="w-12 px-1">
        {row.imgDataUrl ? (
          <img
            src={row.imgDataUrl}
            alt={row.imgName}
            className="w-9 h-9 object-cover rounded cursor-pointer border border-slate-200 hover:border-blue-400"
            onClick={() => onShowLightbox(row.imgDataUrl, row.imgName)}
          />
        ) : (
          <div className="w-9 h-9 rounded border border-dashed border-slate-200 flex items-center justify-center text-slate-300">
            <i className="fa-solid fa-image text-xs" />
          </div>
        )}
      </td>

      {/* Row number */}
      <td className="w-8 text-center text-xs text-slate-400 font-mono">{index + 1}</td>

      {/* B col */}
      <td className="px-1">
        <input
          type="text"
          value={cells.colB}
          placeholder="面料描述"
          className={`w-36 px-2 py-1 text-xs border rounded focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 ${cells.colB ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
          onChange={(e) => handleChange('colB', e.target.value)}
        />
      </td>

      {/* C col — inferred style */}
      <td className="px-1">
        <input
          type="text"
          value={cells.colC}
          placeholder="HLWG/HLFG编号"
          title={isInferred ? `🤖 推理编号\n${(row.notes ?? []).find((n) => n.includes('推理')) ?? ''}` : ''}
          className={`w-28 px-2 py-1 text-xs border rounded focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 ${
            isInferred
              ? 'border-violet-300 bg-violet-50 text-violet-700'
              : cells.colC
              ? 'border-amber-300 bg-amber-50'
              : 'border-slate-200'
          }`}
          onChange={(e) => {
            handleChange('colC', e.target.value)
            if (row.inferred) onUpdate(row.id, { inferred: false })
          }}
        />
      </td>

      {/* D E F G cols */}
      {(['colD', 'colE', 'colF', 'colG'] as CellKey[]).map((key) => {
        const col = COLS.find((c) => c.key === key)!
        return (
          <td key={key} className="px-1">
            <input
              type="text"
              value={cells[key]}
              placeholder={col.placeholder}
              className={`${col.cls} px-2 py-1 text-xs border rounded focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 ${cells[key] ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
              onChange={(e) => handleChange(key, e.target.value)}
            />
          </td>
        )
      })}

      {/* H col — read only */}
      <td className="px-1">
        <span className="w-20 px-2 py-1 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded inline-block">
          {cells.colH || '—'}
        </span>
      </td>

      {/* I col */}
      <td className="px-1">
        <input
          type="text"
          value={cells.colI}
          placeholder="工厂批号"
          className={`w-36 px-2 py-1 text-xs border rounded focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 ${cells.colI ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
          onChange={(e) => handleChange('colI', e.target.value)}
        />
      </td>

      {/* Delete */}
      <td className="px-1">
        <button
          className="w-6 h-6 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          onClick={() => onRemove(row.id)}
        >
          <i className="fa-solid fa-xmark text-xs" />
        </button>
      </td>
    </tr>
  )
},
  (prev, next) =>
    prev.row === next.row &&
    prev.index === next.index &&
    prev.checked === next.checked &&
    prev.rowCount === next.rowCount,
)
