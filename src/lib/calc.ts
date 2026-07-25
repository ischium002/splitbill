import type { Activity, Bill, BillItem } from './types'

/**
 * 一条明细拆到每个人头上（整数分）。
 * 均摊除不尽时：先每人 floor，余下的分按活动成员顺序前几位各多摊 1 分，
 * 保证拆分之和严格等于明细金额。
 */
export function splitItem(item: BillItem, memberOrder: string[]): Map<string, number> {
  const ids = memberOrder.filter((id) => item.memberIds.includes(id))
  const out = new Map<string, number>()
  const n = ids.length
  if (n === 0) return out
  const base = Math.floor(item.amountCents / n)
  const rem = item.amountCents - base * n
  ids.forEach((id, i) => out.set(id, base + (i < rem ? 1 : 0)))
  return out
}

function addInto(target: Map<string, number>, src: Map<string, number>) {
  for (const [id, v] of src) target.set(id, (target.get(id) ?? 0) + v)
}

/** 一笔账单每人分摊 */
export function billShares(bill: Bill, memberOrder: string[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const item of bill.items) addInto(out, splitItem(item, memberOrder))
  return out
}

/** 整个活动每人累计分摊 */
export function activityShares(a: Activity): Map<string, number> {
  const order = a.members.map((m) => m.id)
  const out = new Map<string, number>()
  for (const bill of a.bills) addInto(out, billShares(bill, order))
  return out
}

/** 某一天每人分摊 */
export function dayShares(a: Activity, date: string): Map<string, number> {
  const order = a.members.map((m) => m.id)
  const out = new Map<string, number>()
  for (const bill of a.bills) {
    if (bill.date === date) addInto(out, billShares(bill, order))
  }
  return out
}

/** 某成员在一条明细里的份额 */
export interface LedgerEntry {
  item: BillItem
  shareCents: number
  /** 这条明细几人分（个人项为 1），用于显示"均摊 1/N" */
  splitCount: number
}

/** 某成员参与的一笔账单：TA 的明细 + 小计 */
export interface LedgerBill {
  bill: Bill
  entries: LedgerEntry[]
  subtotal: number
}

/**
 * 某成员的个人流水：按日期、录入先后排序，只含 TA 参与的账单。
 * 份额走同一个 splitItem，保证和荷包行 / 结算页数字一致。
 */
export function memberLedger(a: Activity, memberId: string): LedgerBill[] {
  const order = a.members.map((m) => m.id)
  const bills = [...a.bills].sort(
    (x, y) => x.date.localeCompare(y.date) || x.createdAt - y.createdAt
  )
  const out: LedgerBill[] = []
  for (const bill of bills) {
    const entries: LedgerEntry[] = []
    for (const item of bill.items) {
      const share = splitItem(item, order).get(memberId)
      if (share === undefined) continue
      entries.push({
        item,
        shareCents: share,
        splitCount: order.filter((id) => item.memberIds.includes(id)).length,
      })
    }
    if (entries.length > 0)
      out.push({ bill, entries, subtotal: entries.reduce((s, e) => s + e.shareCents, 0) })
  }
  return out
}

/** 账单已录明细合计。全 App 的"支出"都以此为准（totalCents 只是录入校验）。 */
export function billAllocated(bill: Bill): number {
  return bill.items.reduce((s, it) => s + it.amountCents, 0)
}

/** 活动累计支出 */
export function activitySpent(a: Activity): number {
  return a.bills.reduce((s, b) => s + billAllocated(b), 0)
}

/** 基金池总额 */
export function fundTotal(a: Activity): number {
  return a.members.reduce((s, m) => s + m.fundCents, 0)
}

/** 账单副标题，如 "2 条明细 · 全员" / "5 条明细 · 部分个人" */
export function billMeta(bill: Bill, memberCount: number): string {
  const n = bill.items.length
  const allShared = bill.items.every(
    (it) => it.kind === 'shared' && it.memberIds.length === memberCount
  )
  const hasPersonal = bill.items.some((it) => it.kind === 'personal')
  const tag = allShared ? '全员' : hasPersonal ? '部分个人' : '部分共享'
  return `${n} 条明细 · ${tag}`
}
