import type { AppSettings } from '../types/fabric'

const PREFIX = 'fabric_cfg_'

export function getCfg(key: string, def: string): string
export function getCfg(key: string, def: number): number
export function getCfg(key: string, def: string | number): string | number {
  const v = localStorage.getItem(PREFIX + key)
  if (v === null) return def
  const num = Number(v)
  return !isNaN(num) && typeof def === 'number' ? num : v
}

export function setCfg(key: string, val: string | number): void {
  localStorage.setItem(PREFIX + key, String(val))
}

export function loadSettings(): AppSettings {
  return {
    sheetName: getCfg('sheet_name', '面料数据库'),
    filePrefix: getCfg('file_prefix', '一分三科面料'),
    syncInterval: getCfg('sync_interval', 15),
    thumbSize: getCfg('thumb_size', 120),
  }
}

export function saveSettings(s: AppSettings): void {
  setCfg('sheet_name', s.sheetName)
  setCfg('file_prefix', s.filePrefix)
  setCfg('sync_interval', s.syncInterval)
  setCfg('thumb_size', s.thumbSize)
}
