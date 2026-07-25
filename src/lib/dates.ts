function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 本地时区的今天，YYYY-MM-DD */
export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 2026-05-01 → 5月1日 */
export function fmtDay(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${+m}月${+d}日`
}

/** 2026-05-01 → 5.1 */
export function fmtChip(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${+m}.${+d}`
}

/** 4.29 – 5.5，缺失时返回空串 */
export function fmtRange(start: string, end: string): string {
  if (start && end) return `${fmtChip(start)} – ${fmtChip(end)}`
  if (start) return fmtChip(start)
  return ''
}
