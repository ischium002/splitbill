<script lang="ts">
  import { nav } from '../lib/router.svelte'
  import { persist, removeActivity } from '../lib/store.svelte'
  import { fmt, fmtSigned, sym } from '../lib/money'
  import { activityShares, activitySpent, fundTotal } from '../lib/calc'
  import { fmtRange } from '../lib/dates'
  import Avatar from '../lib/Avatar.svelte'
  import type { Activity } from '../lib/types'

  let { activity }: { activity: Activity } = $props()

  let menuOpen = $state(false)
  let renaming = $state(false)

  const total = $derived(fundTotal(activity))
  const spent = $derived(activitySpent(activity))
  const remain = $derived(total - spent)
  const pct = $derived(total > 0 ? Math.min(100, (spent / total) * 100) : 0)
  const shares = $derived(activityShares(activity))

  function focusSelect(node: HTMLInputElement) {
    node.focus()
    node.select()
  }

  function commitRename(e: Event) {
    const v = (e.currentTarget as HTMLInputElement).value.trim()
    if (v && v !== activity.name) {
      activity.name = v
      persist(activity)
    }
    renaming = false
  }

  function toggleSettled() {
    menuOpen = false
    activity.settled = !activity.settled
    persist(activity)
  }

  function del() {
    menuOpen = false
    if (confirm(`删除「${activity.name}」？所有账单记录会一起删掉，删了就没了。`)) {
      removeActivity(activity.id)
      nav('')
    }
  }
</script>

<div class="relative flex flex-1 flex-col pt-[max(env(safe-area-inset-top),20px)]">
  <div class="flex items-start justify-between px-6 pt-3.5">
    <div class="min-w-0 flex-1 pr-3">
      <button class="text-[15px] font-semibold text-accent" onclick={() => nav('')}>‹ 活动</button>
      {#if renaming}
        <input
          class="mt-1 w-full bg-transparent text-2xl font-extrabold"
          value={activity.name}
          use:focusSelect
          onblur={commitRename}
          onkeydown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
          }}
        />
      {:else}
        <button class="mt-1 block text-2xl font-extrabold" onclick={() => (renaming = true)}>
          {activity.name}
        </button>
      {/if}
      <div class="mt-[3px] text-[13px] text-sub">
        {fmtRange(activity.startDate, activity.endDate)}
        {activity.startDate ? ' · ' : ''}{activity.members.length} 人{activity.settled
          ? ' · 已结算'
          : ''}
      </div>
    </div>
    <button
      aria-label="更多操作"
      class="flex h-9 w-9 items-center justify-center rounded-full bg-card2 text-[17px] text-sub"
      onclick={() => (menuOpen = !menuOpen)}>⋯</button
    >
  </div>

  {#if menuOpen}
    <button
      class="fixed inset-0 z-10 cursor-default"
      aria-label="关闭菜单"
      onclick={() => (menuOpen = false)}
    ></button>
    <div
      class="absolute top-24 right-6 z-20 flex w-44 flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-[0_10px_30px_rgba(45,32,14,.18)]"
    >
      <button
        class="px-4 py-3.5 text-left text-[15px] font-semibold"
        onclick={() => {
          menuOpen = false
          renaming = true
        }}>重命名</button
      >
      <button
        class="border-t border-line px-4 py-3.5 text-left text-[15px] font-semibold"
        onclick={() => {
          menuOpen = false
          nav('settings')
        }}>设置 / 备份</button
      >
      <button
        class="border-t border-line px-4 py-3.5 text-left text-[15px] font-semibold"
        onclick={toggleSettled}>{activity.settled ? '恢复为进行中' : '标记为已结算'}</button
      >
      <button
        class="border-t border-line px-4 py-3.5 text-left text-[15px] font-semibold text-neg"
        onclick={del}>删除活动</button
      >
    </div>
  {/if}

  <div class="px-6 pt-5 pb-[18px]">
    <div class="text-[13px] text-sub">基金池剩余</div>
    <div class="num mt-0.5 text-5xl font-bold tracking-[-0.5px]">{fmt(remain)}</div>
    <div class="num mt-1 text-[13px] text-sub">
      总额 {fmt(total)} · 已支出 {fmt(spent)}
    </div>
    <div class="mt-3 h-1.5 overflow-hidden rounded-[3px] bg-card2">
      <div class="h-full rounded-[3px] bg-accent" style="width:{pct}%"></div>
    </div>
  </div>

  {#if activity.bills.length === 0}
    <div
      class="flex flex-1 flex-col items-center justify-center gap-3.5 rounded-t-[28px] border-t border-line bg-card px-10 pb-32 text-center"
    >
      <div
        class="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-card2 text-4xl text-sub"
      >
        {sym()}
      </div>
      <div class="text-[17px] font-bold">还没有账单</div>
      <div class="text-[13px] leading-7 text-sub">
        记下第一笔，每个人的荷包<br />就开始自动计算了
      </div>
    </div>
  {:else}
    <div
      class="flex flex-1 flex-col gap-1 rounded-t-[28px] border-t border-line bg-card px-6 pt-5 pb-32"
    >
      <div class="pb-2 text-[13px] font-bold text-sub">每人荷包</div>
      {#each activity.members as m (m.id)}
        {@const share = shares.get(m.id) ?? 0}
        {@const bal = m.fundCents - share}
        {@const isNeg = bal < 0}
        {@const barPct = m.fundCents > 0 ? Math.min(100, (share / m.fundCents) * 100) : 100}
        <button
          class="flex w-full items-center gap-3 rounded-2xl px-2.5 py-3 text-left {isNeg
            ? 'bg-neg-soft'
            : 'bg-transparent'}"
          onclick={() => nav(`a/${activity.id}/m/${m.id}`)}
        >
          <Avatar member={m} size={40} />
          <div class="min-w-0 flex-1">
            <div class="text-[15px] font-semibold">{m.name}</div>
            <div class="mt-1.5 h-1 overflow-hidden rounded-sm bg-card2">
              <div
                class="h-full rounded-sm {isNeg ? 'bg-neg' : 'bg-accent'}"
                style="width:{barPct}%"
              ></div>
            </div>
          </div>
          <div class="num text-[17px] font-bold {isNeg ? 'text-neg' : 'text-pos'}">
            {fmtSigned(bal)}
          </div>
          <div class="text-sub">›</div>
        </button>
      {/each}
    </div>
  {/if}

  <div
    class="sticky bottom-0 flex flex-col gap-2 px-6 pt-3.5 pb-[max(env(safe-area-inset-bottom),10px)]"
    style="background:linear-gradient(transparent, var(--card) 40%)"
  >
    <div class="flex gap-2.5">
      <button
        class="flex h-13 flex-none items-center rounded-full bg-card2 px-[22px] text-[15px] font-semibold"
        onclick={() => nav(`a/${activity.id}/days`)}>按天</button
      >
      <button
        class="flex h-13 flex-1 items-center justify-center rounded-full bg-accent text-base font-bold text-white shadow-[0_8px_20px_rgba(196,112,58,.35)]"
        onclick={() => nav(`a/${activity.id}/bill`)}
        >＋ {activity.bills.length === 0 ? '记第一笔' : '记一笔'}</button
      >
      <button
        class="flex h-13 flex-none items-center rounded-full bg-card2 px-[22px] text-[15px] font-semibold"
        onclick={() => nav(`a/${activity.id}/settle`)}>结算</button
      >
    </div>
  </div>
</div>
