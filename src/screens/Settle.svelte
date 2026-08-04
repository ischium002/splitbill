<script lang="ts">
  import { nav } from '../lib/router.svelte'
  import { fmt, fmtPlain, sym } from '../lib/money'
  import { activityShares, activitySpent, fundTotal } from '../lib/calc'
  import { fmtRange } from '../lib/dates'
  import { persist } from '../lib/store.svelte'
  import { encodeShare, shareUrl } from '../lib/share'
  import Avatar from '../lib/Avatar.svelte'
  import type { Activity } from '../lib/types'

  let { activity }: { activity: Activity } = $props()

  const total = $derived(fundTotal(activity))
  const spent = $derived(activitySpent(activity))
  const remain = $derived(total - spent)
  const shares = $derived(activityShares(activity))

  const rows = $derived(
    activity.members.map((m) => {
      const share = shares.get(m.id) ?? 0
      const bal = m.fundCents - share
      return { m, share, bal }
    })
  )
  const refundSum = $derived(rows.reduce((s, r) => s + Math.max(0, r.bal), 0))
  const owedSum = $derived(rows.reduce((s, r) => s + Math.max(0, -r.bal), 0))

  const treasurer = $derived(activity.members.find((m) => m.id === activity.treasurerId))
  /** 基金模式下所有转账都经管钱人：负荷包补给 TA，正荷包从 TA 手里领 */
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
  const treasurerRow = $derived(treasurer ? rows.find((r) => r.m.id === treasurer.id) : undefined)

  function setTreasurer(id: string) {
    activity.treasurerId = activity.treasurerId === id ? undefined : id
    persist(activity)
  }

  async function share() {
    const lines = [
      `${activity.name} · 结算单`,
      `基金实付 ${fmt(spent)} · 剩余 ${fmt(remain)}`,
      ...rows.map(
        (r) =>
          `${r.m.name}：缴 ${fmt(r.m.fundCents)}，分摊 ${fmt(r.share)}，${
            r.bal < 0 ? '应补' : '应退'
          } ${fmt(Math.abs(r.bal))}`
      ),
      ...(treasurer
        ? [
            `—— 转账建议（${treasurer.name} 管钱）——`,
            ...transfers.map((t) => `${t.from.name} → ${t.to.name} ${fmt(t.cents)}`),
          ]
        : []),
      '— splitbill',
    ]
    // 只读快照链接：对方点开能看到完整明细，不用装 App
    const url = shareUrl(await encodeShare($state.snapshot(activity) as Activity))
    const text = lines.join('\n')
    if (navigator.share) {
      try {
        await navigator.share({ text: `${text}\n明细点这里看 👇`, url })
        return
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return // 用户取消
      }
    }
    await navigator.clipboard.writeText(`${text}\n明细点这里看 👇\n${url}`)
    alert('结算单文字和只读链接已复制，直接粘贴到群里')
  }
</script>

<div class="flex flex-1 flex-col pt-[env(safe-area-inset-top)]">
  <div class="flex items-center justify-between px-6 py-2.5">
    <button class="text-[15px] font-semibold text-accent" onclick={() => nav(`a/${activity.id}`)}
      >‹ 返回</button
    >
    <div class="text-base font-bold">结算</div>
    <button class="text-[15px] font-semibold text-accent" onclick={share}>分享</button>
  </div>

  <div class="flex-1 px-5 pt-2 pb-6">
    <div class="mb-3 flex items-center gap-2 overflow-x-auto px-1">
      <span class="flex-none text-xs text-sub">谁管钱</span>
      {#each activity.members as m (m.id)}
        <button
          class="flex-none rounded-full px-3.5 py-1.5 text-[13px] font-semibold {activity.treasurerId ===
          m.id
            ? 'bg-accent text-white'
            : 'bg-card2 text-ink'}"
          onclick={() => setTreasurer(m.id)}>{m.name}</button
        >
      {/each}
    </div>

    <div
      class="flex flex-col gap-3.5 rounded-3xl border border-line bg-card px-[22px] pt-[22px] pb-[18px] shadow-[0_6px_24px_rgba(45,32,14,.08)]"
    >
      <div class="text-center">
        <div class="text-[19px] font-extrabold">{activity.name} · 结算单</div>
        <div class="mt-1 text-xs text-sub">
          {fmtRange(activity.startDate, activity.endDate)}{activity.startDate
            ? ' · '
            : ''}{activity.members.length} 人
        </div>
        <div class="mt-3.5 text-[11px] text-sub">基金实付</div>
        <div class="num mt-0.5 text-[38px] font-bold tracking-[-0.5px]">{fmt(spent)}</div>
        <div class="num mt-1 text-xs text-sub">基金池 {fmt(total)} · 剩余 {fmt(remain)}</div>
      </div>

      <div class="border-t-2 border-dashed border-line"></div>

      <div class="flex flex-col">
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
                {sym()}{fmtPlain(r.bal)}
              </div>
            </div>
          </div>
        {/each}
      </div>

      {#if treasurer}
        <div class="border-t-2 border-dashed border-line"></div>

        <div class="flex flex-col gap-1.5">
          <div class="text-[11px] text-sub">转账建议 · {treasurer.name} 管钱</div>
          {#if transfers.length === 0}
            <div class="text-sm text-sub">两清，不需要转账 ✓</div>
          {:else}
            {#each transfers as t (t.from.id + t.to.id)}
              <div class="flex items-center justify-between text-sm">
                <span class="font-semibold">{t.from.name} → {t.to.name}</span>
                <span class="num font-bold">{fmt(t.cents)}</span>
              </div>
            {/each}
          {/if}
          {#if treasurerRow && treasurerRow.bal !== 0}
            <div class="text-[11px] text-sub">
              {treasurer.name} 自己的{treasurerRow.bal < 0
                ? `应补 ${fmt(-treasurerRow.bal)} 直接垫进池子`
                : `应退 ${fmt(treasurerRow.bal)} 直接从池子剩余里留下`}，不用转账
            </div>
          {/if}
        </div>
      {/if}

      <div class="border-t-2 border-dashed border-line"></div>

      <div class="num flex justify-between text-xs text-sub">
        <span>应退合计 {fmt(refundSum)} − 应补合计 {fmt(owedSum)}</span>
        <span class="font-bold text-ink">= 剩余 {fmt(remain)}</span>
      </div>

      <div class="flex items-center justify-center gap-[7px] pt-0.5">
        <div
          class="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent text-[10px] font-extrabold text-white"
        >
          s
        </div>
        <div class="text-[11px] text-sub">ʕ·ᴥ·ʔ · splitbill</div>
      </div>
    </div>

    <div class="mt-3.5 text-center text-xs text-sub">截图上面这张卡，发到群里就行</div>
  </div>
</div>
