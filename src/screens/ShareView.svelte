<script lang="ts">
  import { decodeShare, type ShareSnapshot } from '../lib/share'
  import { fmt as formatMoney, fmtPlain, sym } from '../lib/money'
  import { fmtDay, fmtRange } from '../lib/dates'
  import { activityShares, activitySpent, fundTotal, billAllocated } from '../lib/calc'
  import Avatar from '../lib/Avatar.svelte'
  import type { Activity, BillItem } from '../lib/types'

  let { payload }: { payload: string } = $props()

  let activity = $state<ShareSnapshot | null>(null)
  let failed = $state(false)

  const snapshotSymbol = $derived(activity?.currencySymbol ?? sym())

  function fmt(cents: number): string {
    return formatMoney(cents, snapshotSymbol)
  }

  $effect(() => {
    decodeShare(payload).then((a) => {
      if (a) activity = a
      else failed = true
    })
  })

  const total = $derived(activity ? fundTotal(activity) : 0)
  const spent = $derived(activity ? activitySpent(activity) : 0)
  const shares = $derived(activity ? activityShares(activity) : new Map<string, number>())
  const rows = $derived(
    activity
      ? activity.members.map((m) => {
          const share = shares.get(m.id) ?? 0
          return { m, share, bal: m.fundCents - share }
        })
      : []
  )
  const treasurer = $derived(activity?.members.find((m) => m.id === activity?.treasurerId))
  const transfers = $derived(
    treasurer
      ? rows
          .filter((r) => r.m.id !== treasurer.id && r.bal !== 0)
          .map((r) => ({
            from: r.bal < 0 ? r.m : treasurer,
            to: r.bal < 0 ? treasurer : r.m,
            cents: Math.abs(r.bal),
          }))
      : []
  )
  /** 账单按日期分组（decode 时已排序） */
  const days = $derived.by(() => {
    if (!activity) return []
    const map = new Map<string, Activity['bills']>()
    for (const b of activity.bills) {
      if (!map.has(b.date)) map.set(b.date, [])
      map.get(b.date)!.push(b)
    }
    return [...map.entries()]
  })

  function itemMeta(it: BillItem): string {
    if (!activity) return ''
    if (it.kind === 'personal') {
      const m = activity.members.find((mm) => mm.id === it.memberIds[0])
      return `个人 · ${m?.name ?? '?'}`
    }
    if (it.memberIds.length === activity.members.length) return '均摊'
    // 部分人摊：直接列名字，谁摊的一目了然
    const names = activity.members
      .filter((m) => it.memberIds.includes(m.id))
      .map((m) => m.name)
    return `${names.join('+')} 摊`
  }
</script>

<div class="flex flex-1 flex-col pt-[env(safe-area-inset-top)]">
  {#if failed}
    <div class="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
      <div class="text-base font-bold">链接打不开</div>
      <div class="text-sm text-sub">分享链接不完整或已损坏，让对方重新发一次试试</div>
    </div>
  {:else if !activity}
    <div class="flex flex-1 items-center justify-center text-sm text-sub">…</div>
  {:else}
    <div class="px-6 py-2.5 text-center">
      <div class="text-lg font-bold">{activity.name}</div>
      <div class="mt-0.5 text-xs text-sub">
        {fmtRange(activity.startDate, activity.endDate)}{activity.startDate ? ' · ' : ''}只读快照
      </div>
    </div>

    <div class="flex-1 px-5 pb-10">
      <div class="rounded-[20px] border border-line bg-card p-4">
        <div class="flex justify-between text-sm">
          <span class="text-sub">基金池</span><span class="num font-bold">{fmt(total)}</span>
        </div>
        <div class="mt-1.5 flex justify-between text-sm">
          <span class="text-sub">已花</span><span class="num font-bold">{fmt(spent)}</span>
        </div>
        <div class="mt-1.5 flex justify-between text-sm">
          <span class="text-sub">剩余</span><span class="num font-bold">{fmt(total - spent)}</span>
        </div>

        <div class="mt-3 flex flex-col border-t border-line">
          {#each rows as r (r.m.id)}
            <div class="flex items-center gap-2.5 border-b border-line py-[11px]">
              <Avatar member={r.m} size={34} />
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold">{r.m.name}</div>
                <div class="num mt-0.5 text-[11px] text-sub">
                  缴 {fmt(r.m.fundCents)} · 分摊 {fmt(r.share)}
                </div>
              </div>
              <div class="text-right">
                <div class="text-[11px] {r.bal < 0 ? 'text-neg' : 'text-pos'}">
                  {r.bal < 0 ? '应补' : '应退'}
                </div>
                <div class="num text-lg font-bold {r.bal < 0 ? 'text-neg' : 'text-pos'}">
                  {snapshotSymbol}{fmtPlain(r.bal)}
                </div>
              </div>
            </div>
          {/each}
        </div>

        {#if treasurer && transfers.length > 0}
          <div class="mt-3">
            <div class="text-xs text-sub">转账建议（{treasurer.name} 管钱）</div>
            {#each transfers as t (t.from.id + t.to.id)}
              <div class="mt-1.5 flex items-center justify-between text-sm">
                <span>{t.from.name} → {t.to.name}</span>
                <span class="num font-bold">{fmt(t.cents)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      {#each days as [date, bills] (date)}
        <div class="mt-4 mb-1.5 px-1 text-xs font-semibold text-sub">{fmtDay(date)}</div>
        {#each bills as bill (bill.id)}
          <div class="mb-2 rounded-2xl border border-line bg-card px-3.5 py-3">
            <div class="flex items-baseline justify-between">
              <div class="truncate text-sm font-semibold">{bill.title}</div>
              <div class="num text-[15px] font-bold">{fmt(billAllocated(bill))}</div>
            </div>
            {#each bill.items as it (it.id)}
              <div class="mt-1.5 flex items-baseline justify-between text-[13px]">
                <span class="truncate text-sub">{it.label} · {itemMeta(it)}</span>
                <span class="num text-sub">{fmt(it.amountCents)}</span>
              </div>
            {/each}
          </div>
        {/each}
      {/each}

      <div class="mt-6 pb-[max(env(safe-area-inset-bottom),16px)] text-center text-[11px] text-sub">
        数据为分享那一刻的快照 · 由 splitbill 生成
      </div>
    </div>
  {/if}
</div>
