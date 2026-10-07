/** 金额一律以整数分存储计算，只在显示时转成字符串，避免浮点精度问题。 */

function group(cents: number): string {
  return (Math.abs(cents) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** 货币符号默认 $；App 启动时由 currency.svelte.ts 注入响应式来源，纯逻辑测试不受影响 */
let symbolSource = () => '$'

export function setSymbolSource(fn: () => string) {
  symbolSource = fn
}

/** 当前货币符号。在模板 / $derived 里调用会跟随设置自动更新 */
export function sym(): string {
  return symbolSource()
}

/** $1,234.56（负数带 −） */
export function fmt(cents: number, symbol = sym()): string {
  return (cents < 0 ? '−' : '') + symbol + group(cents)
}

/** +$12.30 / −$4.50，荷包余额用 */
export function fmtSigned(cents: number): string {
  return (cents < 0 ? '−' : '+') + sym() + group(cents)
}

/** 不带货币符号的数字串 */
export function fmtPlain(cents: number): string {
  return group(cents)
}

/** 用户输入 → 整数分；非法输入返回 null */
export function parseAmount(input: string): number | null {
  const t = input.trim().replace(/[,$￥¥€£\s]/g, '')
  if (t === '' || !/^\d+(\.\d{0,2})?$/.test(t)) return null
  const [int, frac = ''] = t.split('.')
  return parseInt(int, 10) * 100 + parseInt((frac + '00').slice(0, 2), 10)
}

/** 分 → 输入框回显用的字符串（86.4 → "86.40"） */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}
