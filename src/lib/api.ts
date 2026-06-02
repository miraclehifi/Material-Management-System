import type { DBRecord, FabricRow, HistorySession } from '../types/fabric'
import { calcInchDisplay } from './utils'

const BASE = 'tables'

export async function fetchRecords(limit = 300): Promise<DBRecord[]> {
  const res = await fetch(`${BASE}/fabric_records?limit=${limit}&sort=row_index`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { data: DBRecord[] }
  return data.data ?? []
}

export async function createRecord(payload: Omit<DBRecord, 'id'>): Promise<string | null> {
  const res = await fetch(`${BASE}/fabric_records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) return null
  const saved = (await res.json()) as { id: string }
  return saved.id
}

export async function updateRecord(dbId: string, payload: Partial<DBRecord>): Promise<void> {
  await fetch(`${BASE}/fabric_records/${dbId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteRecord(dbId: string): Promise<void> {
  await fetch(`${BASE}/fabric_records/${dbId}`, { method: 'DELETE' })
}

export async function fetchSessions(limit = 200): Promise<HistorySession[]> {
  const res = await fetch(`${BASE}/fabric_sessions?limit=${limit}&sort=created_at`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { data: HistorySession[] }
  return data.data ?? []
}

export async function createSession(payload: {
  session_id: string
  session_label: string
  operator: string
  row_count: number
  created_at_custom: string
}): Promise<void> {
  await fetch(`${BASE}/fabric_sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function dbRecordToRow(r: DBRecord, rowId: string): FabricRow {
  return {
    id: rowId,
    colB: r.col_b ?? '',
    colC: r.col_c ?? '',
    colD: r.col_d ?? '',
    colE: r.col_e ?? '',
    colF: r.col_f ?? '',
    colG: r.col_g ?? '',
    colH: r.col_h ?? calcInchDisplay(parseFloat(r.col_g)),
    colI: r.col_i ?? '',
    imgDataUrl: r.img_data_url ?? '',
    imgName: r.img_name ?? '',
    ocrRaw: r.ocr_raw ?? '',
    sessionId: r.session_id ?? '',
    createdAt: r.created_at_custom ?? '',
    ourIdRaw: '',
    inferred: false,
    notes: [],
    dbId: r.id,
  }
}

export function rowToPayload(
  row: FabricRow,
  rowIndex: number,
  sessionId: string,
): Omit<DBRecord, 'id'> {
  return {
    session_id: row.sessionId || sessionId,
    session_time: row.createdAt,
    row_index: rowIndex,
    img_data_url: row.imgDataUrl,
    img_name: row.imgName,
    col_b: row.colB,
    col_c: row.colC,
    col_d: row.colD,
    col_e: row.colE,
    col_f: row.colF,
    col_g: row.colG,
    col_h: row.colH,
    col_i: row.colI,
    ocr_raw: row.ocrRaw.slice(0, 5000),
    created_at_custom: row.createdAt,
  }
}
