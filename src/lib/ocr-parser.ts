import type { CompEntry, ParsedRow } from '../types/fabric'
import { calcInchDisplay } from './utils'

const DEFAULT_COMP_MAP: CompEntry[] = [
  { abbr: 'P', cn: '聚酯纤维', en: 'Polyester' },
  { abbr: 'PET', cn: '聚酯纤维', en: 'Polyester' },
  { abbr: 'C', cn: '棉', en: 'Cotton' },
  { abbr: 'CO', cn: '棉', en: 'Cotton' },
  { abbr: 'V', cn: '粘纤', en: 'Viscose' },
  { abbr: 'R', cn: '粘纤', en: 'Viscose' },
  { abbr: 'CV', cn: '粘纤', en: 'Viscose' },
  { abbr: 'L', cn: '亚麻', en: 'Linen' },
  { abbr: 'LI', cn: '亚麻', en: 'Linen' },
  { abbr: 'N', cn: '锦纶', en: 'Nylon' },
  { abbr: 'PA', cn: '锦纶', en: 'Nylon' },
  { abbr: 'SP', cn: '氨纶', en: 'Elastane' },
  { abbr: 'E', cn: '氨纶', en: 'Elastane' },
  { abbr: 'EA', cn: '氨纶', en: 'Elastane' },
  { abbr: 'M', cn: '莫代尔', en: 'Modal' },
  { abbr: 'MD', cn: '莫代尔', en: 'Modal' },
  { abbr: 'TEN', cn: '天丝', en: 'Lyocell/Tencel' },
  { abbr: 'T', cn: '涤纶', en: 'Polyester' },
  { abbr: 'ME', cn: '金属纤维', en: 'Metallic' },
  { abbr: 'LU', cn: '卢勒克斯', en: 'Lurex' },
  { abbr: 'W', cn: '羊毛', en: 'Wool' },
  { abbr: 'WO', cn: '羊毛', en: 'Wool' },
  { abbr: 'A', cn: '腈纶', en: 'Acrylic' },
  { abbr: 'AC', cn: '腈纶', en: 'Acrylic' },
  { abbr: 'PU', cn: '聚氨酯', en: 'Polyurethane' },
  { abbr: 'CVC', cn: '棉涤混纺', en: 'CVC' },
  { abbr: 'TC', cn: '涤棉混纺', en: 'T/C' },
]

export function getCompMap(): CompEntry[] {
  try {
    const s = localStorage.getItem('fabric_comp_map')
    return s ? (JSON.parse(s) as CompEntry[]) : DEFAULT_COMP_MAP
  } catch {
    return DEFAULT_COMP_MAP
  }
}

export function parseComposition(raw: string): string {
  if (!raw?.trim()) return ''
  const map = [...getCompMap()].sort((a, b) => b.abbr.length - a.abbr.length)
  let text = raw.trim().replace(/(\d+)\s*\/\s*([A-Za-z]+)/g, '$1%$2')
  const pairs: Array<{ pct: string; abbr: string }> = []
  const re1 = /(\d+\.?\d*)\s*%\s*([A-Za-z]+)/gi
  let m: RegExpExecArray | null
  while ((m = re1.exec(text)) !== null) pairs.push({ pct: m[1], abbr: m[2] })
  if (!pairs.length) {
    const re2 = /([A-Za-z]+)\s*(\d+\.?\d*)\s*%/gi
    while ((m = re2.exec(text)) !== null) pairs.push({ pct: m[2], abbr: m[1] })
  }
  if (!pairs.length) {
    text.split(/[\s,，;；]+/).forEach((p) => {
      const rm = p.match(/^(\d+\.?\d*)([A-Za-z]+)$/i)
      if (rm) pairs.push({ pct: rm[1], abbr: rm[2] })
    })
  }
  if (!pairs.length) return raw
  return pairs
    .map(({ pct, abbr }) => {
      const up = abbr.toUpperCase()
      const hit =
        map.find((c) => c.abbr.toUpperCase() === up) ??
        map.find((c) => up.startsWith(c.abbr.toUpperCase()) && c.abbr.length >= 2)
      return `${pct}% ${hit ? hit.en : abbr}`
    })
    .join(' ')
}

function parseWidth(text: string): { widthM: number; widthInch: string; note: string } | null {
  if (!text) return null
  const isEff = ['cuttable', 'cw', '有效门幅', '可裁门幅', '可裁', '有效'].some((k) =>
    text.toLowerCase().includes(k),
  )
  let cm: number | null = null
  let note = ''
  const md = text.match(/(\d+)\s*\/\s*(\d+)\s*["''"″]/)
  if (md) {
    const lg = Math.max(+md[1], +md[2])
    cm = lg * 2.54
    note = `英寸${md[1]}/${md[2]}"→${cm.toFixed(1)}cm`
  }
  if (cm === null) {
    const ms = text.match(/(\d+\.?\d*)\s*["''"″]/)
    if (ms) { cm = +ms[1] * 2.54; note = `英寸${ms[1]}"` }
  }
  if (cm === null) {
    const mc = text.match(/(\d+\.?\d*)\s*[Cc][Mm]/)
    if (mc) { cm = +mc[1]; note = `${cm}cm` }
  }
  if (cm === null) {
    const mn = text.match(/(\d{2,3}\.?\d*)/)
    if (mn) {
      const n = +mn[1]
      if (n > 10 && n < 400) { cm = n; note = `推断${cm}cm` }
    }
  }
  if (cm === null) return null
  if (isEff) { note += `+5cm(有效)`; cm += 5 }
  const widthM = Math.round(cm) / 100
  return { widthM, widthInch: calcInchDisplay(widthM), note }
}

const STRIP_WORDS = [
  '浙江', '广东', '江苏', '福建', '山东', '河北', '安徽', '四川', '湖南', '湖北',
  '省', '市', '县', '区', '纺织', '织造', '面料', '服装', '服饰', '布料', '印染',
  '有限公司', '有限责任公司', '股份', '集团', '公司', '工厂', '厂',
  'textile', 'fabric', 'co', 'ltd', 'limited',
]

function extractFactoryShort(name: string): string {
  let s = name.trim().replace(/[\(（][^）)]*[\)）]/g, '')
  for (const w of STRIP_WORDS) s = s.replace(new RegExp(w, 'gi'), '')
  return s.replace(/\s+/g, '').trim().slice(0, 4) || name.slice(0, 4)
}

function extractVal(line: string, kw: string): string {
  const idx = line.toLowerCase().indexOf(kw.toLowerCase())
  if (idx === -1) return ''
  let rest = line
    .substring(idx + kw.length)
    .trim()
    .replace(/^[\s：:=\-–—\|｜\(（]+/, '')
    .trim()
  const stop = rest.search(/[\t｜|]/)
  if (stop > 0) rest = rest.substring(0, stop).trim()
  return rest
}

export function resolveHLCode(num5: string): string {
  const s = String(num5).trim()
  if (/^\d{5}$/.test(s)) {
    if (s.startsWith('1')) return `HLWG${s}`
    if (s.startsWith('5')) return `HLFG${s}`
  }
  return s
}

function isBarcodeLine(line: string): boolean {
  const clean = line.trim()
  if (clean.length === 0) return false
  const nonAlphaNum = (clean.match(/[^a-zA-Z0-9一-龥\s.\-/%()#+@]/g) ?? []).length
  return nonAlphaNum / clean.length > 0.4 && clean.length > 5
}

function isOurIdLine(line: string): boolean {
  return /^\s*[15]\d{3,5}\s*$/.test(line)
}

function isFactoryLine(line: string): boolean {
  return ['有限公司', '纺织有限', '织造有限', 'Textile', 'fabric co'].some((k) =>
    line.toLowerCase().includes(k.toLowerCase()),
  )
}

function isArtLine(line: string): boolean {
  return /^\s*(货号|编号|Art\.?|Art号)\s*[：:]/i.test(line)
}

function splitIntoBlocks(rawText: string): string[][] {
  const lines = rawText.split('\n')
  const blocks: string[][] = []
  let current: string[] = []
  let consecutiveEmpty = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') {
      consecutiveEmpty++
      if (consecutiveEmpty >= 2 && current.length > 0) {
        blocks.push([...current])
        current = []
        consecutiveEmpty = 0
      } else {
        current.push(line)
      }
      continue
    }
    consecutiveEmpty = 0

    if (isBarcodeLine(trimmed)) {
      if (current.length > 0) { blocks.push([...current]); current = [] }
      continue
    }
    if (isOurIdLine(trimmed)) {
      current.push('__OUR_ID__:' + trimmed.trim())
      continue
    }
    if (isFactoryLine(trimmed) && current.some((l) => !l.startsWith('__OUR_ID__'))) {
      const validLines = current.filter((l) => l.trim() && !l.startsWith('__OUR_ID__'))
      if (validLines.length >= 3) { blocks.push([...current]); current = [line]; continue }
    }
    if (isArtLine(trimmed) && current.some((l) => isArtLine(l))) {
      blocks.push([...current])
      current = [line]
      continue
    }
    current.push(line)
  }

  if (current.length > 0) blocks.push(current)
  return blocks.filter((b) => b.filter((l) => l.trim() && !l.startsWith('__OUR_ID__')).length >= 2)
}

function parseBlock(
  blockLines: string[],
  factoryKwList: string[],
): Omit<ParsedRow, 'inferred' | 'colC'> & { ourIdRaw: string; notes: string[] } {
  const out = {
    colB: '', colD: '', colE: '', colF: '', colG: '', colH: '', colI: '',
    ourIdRaw: '',
    notes: [] as string[],
  }

  const ourIdLines = blockLines.filter((l) => l.startsWith('__OUR_ID__:'))
  const normalLines = blockLines.filter((l) => !l.startsWith('__OUR_ID__'))

  if (ourIdLines.length > 0) {
    out.ourIdRaw = ourIdLines[ourIdLines.length - 1].replace('__OUR_ID__:', '').trim()
  }

  const noKws = ['货号', '编号', 'art', 'no.', '品号', '款号', 'item no']
  let factoryShort = ''
  let factoryNo = ''

  for (const line of normalLines) {
    const ll = line.toLowerCase()
    if (!factoryShort && factoryKwList.some((k) => ll.includes(k.toLowerCase()))) {
      factoryShort = extractFactoryShort(line)
    }
    if (!factoryNo) {
      for (const kw of noKws) {
        if (ll.includes(kw)) {
          const v = extractVal(line, kw)
          if (v) { factoryNo = v; break }
        }
      }
    }
  }
  out.colI = factoryNo ? `${factoryShort}${factoryNo}` : ''

  const nameKws = ['品名', '名称', 'name']
  const colorKws = ['颜色', '色名', 'color', 'colour', '花型']
  let desc = '', color = ''
  for (const line of normalLines) {
    const ll = line.toLowerCase()
    if (!desc) {
      for (const k of nameKws) {
        if (ll.includes(k)) { const v = extractVal(line, k); if (v) { desc = v; break } }
      }
    }
    for (const k of colorKws) {
      if (ll.includes(k)) { const v = extractVal(line, k); if (v && v !== desc) { color = v; break } }
    }
  }
  out.colB = [desc, color].filter(Boolean).join('，')

  const compKws = ['成分', '成份', '纤维含量', 'comp', 'composition', 'material', 'fiber', 'content']
  for (const line of normalLines) {
    if (out.colD) break
    for (const kw of compKws) {
      if (line.toLowerCase().includes(kw)) {
        const raw = extractVal(line, kw)
        if (raw) {
          out.colD = parseComposition(raw) || raw
          out.notes.push(`成分:${raw}→${out.colD}`)
          break
        }
      }
    }
  }

  const specKws = ['规格', '纱支', 'spec', 'specification', 'density']
  for (const line of normalLines) {
    if (out.colE) break
    for (const kw of specKws) {
      if (line.toLowerCase().includes(kw)) { const v = extractVal(line, kw); if (v) { out.colE = v; break } }
    }
  }

  const wtKws = ['克重', '重量', 'gsm', 'g/m²', 'g/㎡', 'weight', 'gram']
  for (const line of normalLines) {
    if (out.colF) break
    const ll = line.toLowerCase()
    for (const kw of wtKws) {
      if (ll.includes(kw)) {
        const gm = line.match(/(\d+\.?\d*)\s*[Gg][Ss]?[Mm]/)
        if (gm) { out.colF = gm[1]; break }
        const v = extractVal(line, kw)
        if (v) { out.colF = v.replace(/[Gg][Ss]?[Mm].*/, '').trim(); break }
      }
    }
  }
  if (!out.colF) {
    const fullText = normalLines.join('\n')
    const gm = fullText.match(/(\d+\.?\d*)\s*[Gg][Ss][Mm]/)
    if (gm) out.colF = gm[1]
  }

  const widthKws = ['门幅', '幅宽', 'width', '门宽', 'cuttable', 'cw', '有效门幅', '可裁门幅']
  const wCands = normalLines.filter((l) => {
    const ll = l.toLowerCase()
    return (
      widthKws.some((k) => ll.includes(k)) ||
      /\d+\s*\/\s*\d+\s*["''"″]/.test(l) ||
      /\d+\s*[Cc][Mm]/.test(l)
    )
  })
  if (wCands.length > 0) {
    const primary =
      wCands.find((l) => ['门幅', '幅宽', 'width'].some((k) => l.toLowerCase().includes(k))) ??
      wCands[0]
    const wr = parseWidth(primary)
    if (wr) {
      out.colG = wr.widthM.toFixed(2)
      out.colH = wr.widthInch
      out.notes.push(`门幅:${wr.note}`)
    }
  }

  return out
}

export function parseOCRMulti(
  rawText: string,
  options: { factoryKw?: string } = {},
): ParsedRow[] {
  const factoryKwList = (options.factoryKw ?? '纺织\n织造\n面料\nTextile\n有限公司')
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean)

  const blocks = splitIntoBlocks(rawText)
  const rawBlocks = blocks.length > 0 ? blocks : [rawText.split('\n')]

  return rawBlocks.map((b) => {
    const parsed = parseBlock(b, factoryKwList)
    return {
      ...parsed,
      colC: parsed.ourIdRaw ? resolveHLCode(parsed.ourIdRaw) : '',
      inferred: false,
    }
  })
}

export function parseOCRFull(
  rawText: string,
  options: { factoryKw?: string } = {},
): ParsedRow {
  const factoryKwList = (options.factoryKw ?? '纺织\n织造\n面料\nTextile\n有限公司')
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean)
  const parsed = parseBlock(rawText.split('\n'), factoryKwList)
  return { ...parsed, colC: parsed.ourIdRaw ? resolveHLCode(parsed.ourIdRaw) : '', inferred: false }
}

export function inferSequentialCodes(rows: Array<{ colC: string; ourIdRaw: string; inferred: boolean; notes: string[] }>): void {
  rows.forEach((row) => {
    if (row.ourIdRaw && !row.colC) {
      row.colC = resolveHLCode(row.ourIdRaw)
    }
  })

  function extractNum(code: string): number | null {
    if (!code) return null
    const m = code.match(/(\d{4,6})$/)
    return m ? parseInt(m[1]) : null
  }

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].colC) continue

    let prevIdx = -1, prevNum: number | null = null
    for (let j = i - 1; j >= 0; j--) {
      const n = extractNum(rows[j].colC)
      if (n !== null) { prevIdx = j; prevNum = n; break }
    }

    let nextIdx = -1, nextNum: number | null = null
    for (let j = i + 1; j < rows.length; j++) {
      const n = extractNum(rows[j].colC)
      if (n !== null) { nextIdx = j; nextNum = n; break }
    }

    if (prevNum !== null && nextNum !== null) {
      const expected = prevNum + (i - prevIdx)
      const expectedFromNext = nextNum - (nextIdx - i)
      if (expected === expectedFromNext) {
        rows[i].colC = resolveHLCode(String(expected))
        rows[i].inferred = true
        rows[i].notes.push(`编号推理: 前${prevNum}后${nextNum} → 推断为${expected}`)
      }
    } else if (prevNum !== null) {
      const expected = prevNum + (i - prevIdx)
      rows[i].colC = resolveHLCode(String(expected))
      rows[i].inferred = true
      rows[i].notes.push(`编号推理: 前${prevNum} → 推断为${expected}`)
    } else if (nextNum !== null) {
      const expected = nextNum - (nextIdx - i)
      rows[i].colC = resolveHLCode(String(expected))
      rows[i].inferred = true
      rows[i].notes.push(`编号推理: 后${nextNum} → 推断为${expected}`)
    }
  }
}
