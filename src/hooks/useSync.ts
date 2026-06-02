import { useEffect, useRef, useCallback, useState } from 'react'
import type { FabricRow, ToastType } from '../types/fabric'
import { fetchRecords, dbRecordToRow } from '../lib/api'
import { calcInchDisplay } from '../lib/utils'

interface UseSyncOptions {
  rows: FabricRow[]
  setRows: React.Dispatch<React.SetStateAction<FabricRow[]>>
  nextRowId: React.MutableRefObject<number>
  showToast: (msg: string, type?: ToastType) => void
  intervalSec: number
  syncIndicatorRef: React.RefObject<HTMLSpanElement | null>
}

export function useSync({
  rows,
  setRows,
  nextRowId,
  showToast,
  intervalSec,
  syncIndicatorRef,
}: UseSyncOptions) {
  const [onlineCount, setOnlineCount] = useState(1)
  const clientId = useRef(`c_${Math.random().toString(36).slice(2, 8)}`)
  const isSyncing = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const doHeartbeat = useCallback(() => {
    try {
      const key = 'fabric_online'
      const data = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, number>
      const now = Date.now()
      for (const k of Object.keys(data)) {
        if (now - data[k] > 30000) delete data[k]
      }
      data[clientId.current] = now
      localStorage.setItem(key, JSON.stringify(data))
      setOnlineCount(Object.keys(data).length)
    } catch {
      /* silent */
    }
  }, [])

  const doSync = useCallback(async () => {
    if (isSyncing.current) return
    isSyncing.current = true
    if (syncIndicatorRef.current) syncIndicatorRef.current.style.display = 'inline-flex'
    try {
      const remoteRows = await fetchRecords()
      const localDbIds = new Set(rows.map((r) => r.dbId).filter(Boolean))
      const newRemote = remoteRows.filter((r) => !localDbIds.has(r.id))

      if (newRemote.length > 0) {
        setRows((prev) => {
          const prevDbIds = new Set(prev.map((r) => r.dbId))
          const additions = newRemote
            .filter((r) => !prevDbIds.has(r.id))
            .map((r) => dbRecordToRow(r, `row_${nextRowId.current++}`))
          return additions.length > 0 ? [...prev, ...additions] : prev
        })
        showToast(`同步到 ${newRemote.length} 条新记录`)
      }

      // Update existing rows from remote (skip rows currently focused)
      const activeEl = document.activeElement
      setRows((prev) =>
        prev.map((row) => {
          const remote = remoteRows.find((r) => r.id === row.dbId)
          if (!remote) return row
          const rowEl = document.getElementById(`tr_${row.id}`)
          if (rowEl?.contains(activeEl)) return row
          return {
            ...row,
            colB: remote.col_b ?? row.colB,
            colC: remote.col_c ?? row.colC,
            colD: remote.col_d ?? row.colD,
            colE: remote.col_e ?? row.colE,
            colF: remote.col_f ?? row.colF,
            colG: remote.col_g ?? row.colG,
            colH: remote.col_h ?? calcInchDisplay(parseFloat(remote.col_g)),
            colI: remote.col_i ?? row.colI,
          }
        }),
      )
    } catch {
      /* silent */
    } finally {
      isSyncing.current = false
      if (syncIndicatorRef.current) syncIndicatorRef.current.style.display = 'none'
    }
  }, [rows, setRows, nextRowId, showToast, syncIndicatorRef])

  useEffect(() => {
    doHeartbeat()
    heartbeatRef.current = setInterval(doHeartbeat, 10000)
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [doHeartbeat])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(doSync, intervalSec * 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [doSync, intervalSec])

  return { onlineCount, doSync }
}
