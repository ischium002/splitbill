<script lang="ts">
  import { nav } from '../lib/router.svelte'
  import { fmt } from '../lib/money'
  import { billAllocated, billMeta, dayShares } from '../lib/calc'
  import { fmtChip, fmtDay } from '../lib/dates'
  import Avatar from '../lib/Avatar.svelte'
  import type { Activity } from '../lib/types'

  let { activity }: { activity: Activity } = $props()

  const dates = $derived([...new Set(activity.bills.map((b) => b.date))].sort())
  let sel = $state('')
  const selDate = $derived(dates.includes(sel) ? sel : (dates[dates.length - 1] ?? ''))

  const dayBills = $derived(
    activity.bills
      .filter((b) => b.date === selDate)
      .sort((a, b) => a.createdAt - b.createdAt)
  )
  const dayTotal = $derived(dayBills.reduce((s, b) => s + billAllocated(b), 0))
  const shares = $derived(dayShares(activity, selDate))
</script>

<div class="flex flex-1 flex-col pt-[env(safe-area-inset-top)]">
  <div class="flex items-center justify-between px-6 py-2.5">
    <button class="text-[15px] font-semibold text-accent" onclick={() => nav(`a/${activity.id}`)}
      >‹ 返回</button
    >
    <div class="text-base font-bold">按天</div>
    <div class="w-10"></div>
  </div>

  {#if dates.length === 0}
    <div class="flex flex-1 flex-col items-center justify-center gap-3 px-10 pb-24 text-center">
      <div class="text-[17px] font-bold">还没有账单</div>
      <div class="text-[13px] leading-7 text-sub">记了账，这里就能按天翻着看</div>
    </div>
  {:else}
    <div class="flex gap-2 overflow-x-auto px-6 pt-1.5 pb-1" style="scrollbar-width:none">
      {#each dates as d (d)}
        <button
          class="flex-none rounded-full px-[13px] py-2 text-[13px] {d === selDate
            ? 'bg-accent font-bold text-white'
            : 'bg-card2 font-semibold text-sub'}"
          onclick={() => (sel = d)}>{fmtChip(d)}</button
        >
      {/each}
    </div>

    <div class="flex items-baseline justify-between px-6 pt-3.5 pb-1">
      <div class="text-[15px] font-bold">{fmtDay(selDate)} · {dayBills.length} 笔账单</div>
      <div class="num text-lg font-bold">{fmt(dayTotal)}</div>
    </div>

    <div class="flex flex-col gap-2 px-6 py-2">
      {#each dayBills as b (b.id)}
        <button
          class="flex items-center gap-2.5 rounded-2xl border border-line bg-card px-4 py-[13px] text-left"
          onclick={() => nav(`a/${activity.id}/bill/${b.id}`)}
        >
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-semibold">{b.title}</div>
            <div class="mt-0.5 text-[11px] text-sub">{billMeta(b, activity.members.length)}</div>
          </div>
          <div class="num text-[15px] font-bold">{fmt(billAllocated(b))}</div>
        </button>
      {/each}
    </div>

    <div class="mx-6 my-2.5 flex flex-col gap-1 rounded-[20px] bg-card2 px-[18px] py-4">
      <div class="pb-1.5 text-[13px] font-bold text-sub">每人当天分摊</div>
      {#each activity.members as m (m.id)}
        <div class="flex items-center gap-2.5 py-1.5">
          <Avatar member={m} size={26} />
          <div class="flex-1 text-[13px] font-semibold">{m.name}</div>
          <div class="num text-sm font-semibold">{fmt(shares.get(m.id) ?? 0)}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>
