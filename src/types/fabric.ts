export interface FabricRow {
  id: string
  colB: string
  colC: string
  colD: string
  colE: string
  colF: string
  colG: string
  colH: string
  colI: string
  ourIdRaw: string
  inferred: boolean
  notes: string[]
  imgDataUrl: string
  imgName: string
  ocrRaw: string
  sessionId: string
  createdAt: string
  dbId: string | null
}

export type ImgStatus = 'waiting' | 'running' | 'done' | 'error'

export interface ImgQueueItem {
  id: string
  file: File
  url: string
  name: string
  status: ImgStatus
  rowIds: string[]
  progress: number
}

export interface AppSettings {
  sheetName: string
  filePrefix: string
  syncInterval: number
  thumbSize: number
}

export interface CompEntry {
  abbr: string
  cn: string
  en: string
}

export type ToastType = 'default' | 'success' | 'warning' | 'error'

export interface ToastState {
  message: string
  type: ToastType
  visible: boolean
}

export interface LightboxState {
  src: string
  name: string
}

export interface OCRProgress {
  visible: boolean
  pct: number
  text: string
}

export interface HistorySession {
  id: string
  session_id: string
  session_label: string
  operator: string
  row_count: number
  created_at_custom: string
}

export interface DBRecord {
  id: string
  session_id: string
  session_time: string
  row_index: number
  img_data_url: string
  img_name: string
  col_b: string
  col_c: string
  col_d: string
  col_e: string
  col_f: string
  col_g: string
  col_h: string
  col_i: string
  ocr_raw: string
  created_at_custom: string
}

export interface ParsedRow {
  colB: string
  colC: string
  colD: string
  colE: string
  colF: string
  colG: string
  colH: string
  colI: string
  ourIdRaw: string
  inferred: boolean
  notes: string[]
}
