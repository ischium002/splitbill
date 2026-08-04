<script lang="ts">
  import { store, removeActivity } from '../lib/store.svelte'
  import { nav } from '../lib/router.svelte'
  import { fmt, fmtPlain, sym } from '../lib/money'
  import { fundTotal, activitySpent } from '../lib/calc'
  import { fmtRange } from '../lib/dates'
  import Avatar from '../lib/Avatar.svelte'
  import SwipeRow from '../lib/SwipeRow.svelte'
  import type { Activity } from '../lib/types'

  // 同一时间只允许一张卡片滑开
  let swipeOpenId = $state<string | null>(null)

  function del(a: Activity) {
    if (confirm(`删除「${a.name}」？所有账单记录会一起删掉，删了就没了。`)) {
      removeActivity(a.id)
    }
    swipeOpenId = null
  }
</script>

<div class="flex flex-1 flex-col px-6 pt-[env(safe-area-inset-top)] pb-8">
  <div class="flex items-center justify-between py-3">
    <div class="text-[28px] font-extrabold">活动</div>
    <div class="flex items-center gap-2">
      <button
        aria-label="设置"
        class="flex h-10 w-10 items-center justify-center rounded-full bg-card2 text-[17px] text-sub"
        onclick={() => nav('settings')}>⋯</button
      >
      <button
        class="flex h-10 items-center rounded-full bg-accent px-[18px] text-sm font-bold text-white"
        onclick={() => nav('new')}>＋ 新建</button
      >
    </div>
  </div>

  <div class="flex flex-col gap-3.5 py-3">
    {#each store.activities as a (a.id)}
      {@const total = fundTotal(a)}
      {@const spent = activitySpent(a)}
      {@const remain = total - spent}
      {@const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0}
      <SwipeRow
        open={swipeOpenId === a.id}
        onOpenChange={(v) => {
          if (v) swipeOpenId = a.id
          else if (swipeOpenId === a.id) swipeOpenId = null
        }}
        onDelete={() => del(a)}
      >
      {#if !a.settled}
        <button
          class="flex w-full flex-col gap-3.5 rounded-3xl border border-line bg-card p-5 shadow-[0_4px_16px_rgba(45,32,14,.06)]"
          onclick={() => nav('a/' + a.id)}
        >
          <div class="flex items-start justify-between self-stretch">
            <div>
              <div class="text-lg font-bold">{a.name}</div>
              <div class="mt-[3px] text-xs text-sub">{fmtRange(a.startDate, a.endDate)}</div>
            </div>
            <div class="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
              进行中
            </div>
          </div>
          <div class="flex items-center justify-between self-stretch">
            <div class="flex">
              {#each a.members.slice(0, 6) as m, i (m.id)}
                <div style="margin-left:{i === 0 ? 0 : -8}px">
                  <Avatar member={m} size={30} ring />
                </div>
              {/each}
            </div>
            <div class="text-right">
              <div class="num text-base font-bold">{fmt(remain)}</div>
              <div class="num text-[11px] text-sub">剩余 / {fmt(total)}</div>
            </div>
          </div>
          <div class="h-[5px] self-stretch overflow-hidden rounded-[3px] bg-card2">
            <div class="h-full bg-accent" style="width:{pct}%"></div>
          </div>
        </button>
      {:else}
        <button
          class="flex w-full flex-col gap-3 rounded-3xl border border-line bg-card p-5 opacity-70"
          onclick={() => nav('a/' + a.id)}
        >
          <div class="flex items-start justify-between self-stretch">
            <div>
              <div class="text-lg font-bold">{a.name}</div>
              <div class="mt-[3px] text-xs text-sub">{fmtRange(a.startDate, a.endDate)}</div>
            </div>
            <div class="rounded-full bg-card2 px-2.5 py-1 text-xs font-bold text-sub">已结算</div>
          </div>
          <div class="flex items-center justify-between self-stretch">
            <div class="text-xs text-sub">{a.members.length} 人 · {a.bills.length} 笔账单</div>
            <div class="num text-sm font-semibold text-sub">实付 ${fmtPlain(spent)}</div>
          </div>
        </button>
      {/if}
      </SwipeRow>
    {/each}

    {#if store.activities.length === 0}
      <div class="flex flex-col items-center gap-3.5 px-10 pt-28 text-center">
        <div
          class="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-card2 text-4xl text-sub"
        >
          {sym()}
        </div>
        <div class="text-[17px] font-bold">还没有活动</div>
        <div class="text-[13px] leading-7 text-sub">
          新建一个活动，把朋友们拉进来<br />每人交一笔经费就可以开始记账了
        </div>
      </div>
    {/if}
  </div>
</div>
