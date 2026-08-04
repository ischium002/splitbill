<script lang="ts">
  import { nav } from '../lib/router.svelte'
  import { fmt, fmtPlain, sym } from '../lib/money'
  import { memberLedger, type LedgerBill, type LedgerEntry } from '../lib/calc'
  import { fmtDay } from '../lib/dates'
  import Avatar from '../lib/Avatar.svelte'
  import type { Activity } from '../lib/types'

  let { activity, memberId }: { activity: Activity; memberId: string } = $props()

  const member = $derived(activity.members.find((m) => m.id === memberId))
  const ledger = $derived(member ? memberLedger(activity, memberId) : [])
  const share = $derived(ledger.reduce((s, b) => s + b.subtotal, 0))
  const bal = $derived((member?.fundCents ?? 0) - share)
  const isNeg = $derived(bal < 0)
  const barPct = $derived(
    member && member.fundCents > 0 ? Math.min(100, (share / member.fundCents) * 100) : 100
  )

  const days = $derived.by(() => {
    const out: { date: string; bills: LedgerBill[] }[] = []
    for (const lb of ledger) {
      const last = out[out.length - 1]
      if (last && last.date === lb.bill.date) last.bills.push(lb)
      else out.push({ date: lb.bill.date, bills: [lb] })
    }
    return out
  })

  $effect(() => {
    // 链接里的成员不存在时回活动页
    if (!member) nav(`a/${activity.id}`)
  })

  function entryMeta(e: LedgerEntry): string {
    return e.item.kind === 'personal' ? '个人' : `均摊 1/${e.splitCount}`
  }

  async function shareText() {
    if (!member) return
    const lines = [
      `${activity.name} · ${member.name}的账单`,
      `缴 ${fmt(member.fundCents)} · 分摊 ${fmt(share)} · ${isNeg ? '应补' : '应退'} ${fmt(Math.abs(bal))}`,
      ...ledger.map((lb) => `${fmtDay(lb.bill.date)} ${lb.bill.title}：${fmt(lb.subtotal)}`),
      '— splitbill',
    ]
    const text = lines.join('\n')
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return // 用户取消
      }
    }
    await navigator.clipboard.writeText(text)
    alert('账单文字已复制，直接粘贴给 TA')
  }
</script>

{#if member}
  <div class="flex flex-1 flex-col pt-[env(safe-area-inset-top)]">
    <div class="flex items-center justify-between px-6 py-2.5">
      <button class="text-[15px] font-semibold text-accent" onclick={() => nav(`a/${activity.id}`)}
        >‹ 返回</button
      >
      <div class="text-base font-bold">{member.name}的账单</div>
      <button class="text-[15px] font-semibold text-accent" onclick={shareText}>分享</button>
    </div>

    <div class="flex-1 px-5 pt-2 pb-6">
      <div
        class="flex flex-col gap-3.5 rounded-3xl border border-line bg-card px-[22px] pt-[22px] pb-[18px] shadow-[0_6px_24px_rgba(45,32,14,.08)]"
      >
        <div class="flex flex-col items-center text-center">
          <Avatar {member} size={52} />
          <div class="mt-2 text-[17px] font-extrabold">{member.name}</div>
          <div class="num mt-0.5 text-xs text-sub">
            缴 {fmt(member.fundCents)} · 分摊 {fmt(share)}
          </div>
          <div class="mt-3.5 text-[11px] {isNeg ? 'text-neg' : 'text-pos'}">
            {isNeg ? '应补' : '荷包剩余'}
          </div>
          <div
            class="num mt-0.5 text-[38px] font-bold tracking-[-0.5px] {isNeg
              ? 'text-neg'
              : 'text-pos'}"
          >
            {sym()}{fmtPlain(bal)}
          </div>
          <div class="mt-3 h-1.5 w-full overflow-hidden rounded-[3px] bg-card2">
            <div
              class="h-full rounded-[3px] {isNeg ? 'bg-neg' : 'bg-accent'}"
              style="width:{barPct}%"
            ></div>
          </div>
        </div>

        <div class="border-t-2 border-dashed border-line"></div>

        {#if ledger.length === 0}
          <div class="py-6 text-center text-[13px] text-sub">还没有 TA 参与的账单</div>
        {:else}
          <div class="flex flex-col gap-3">
            {#each days as day (day.date)}
              <div>
                <div class="pb-1.5 text-xs font-bold text-sub">{fmtDay(day.date)}</div>
                <div class="flex flex-col gap-2">
                  {#each day.bills as lb (lb.bill.id)}
                    <div class="rounded-2xl bg-card2 px-3.5 py-3">
                      <div class="flex items-baseline justify-between gap-2">
                        <div class="min-w-0 truncate text-sm font-bold">{lb.bill.title}</div>
                        <div class="num flex-none text-sm font-bold">{fmt(lb.subtotal)}</div>
                      </div>
                      <div class="mt-1.5 flex flex-col gap-1">
                        {#each lb.entries as e (e.item.id)}
                          <div class="flex items-baseline justify-between gap-2 text-[13px]">
                            <div class="min-w-0 truncate">
                              {e.item.label}
                              <span class="text-[11px] text-sub">· {entryMeta(e)}</span>
                            </div>
                            <div class="num flex-none text-sub">{fmt(e.shareCents)}</div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>

          <div class="border-t-2 border-dashed border-line"></div>

          <div class="num flex justify-between text-xs text-sub">
            <span>合计分摊</span>
            <span class="font-bold text-ink">{fmt(share)}</span>
          </div>
        {/if}

        <div class="flex items-center justify-center gap-[7px] pt-0.5">
          <div
            class="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent text-[10px] font-extrabold text-white"
          >
            s
          </div>
          <div class="text-[11px] text-sub">ʕ·ᴥ·ʔ · splitbill</div>
        </div>
      </div>

      <div class="mt-3.5 text-center text-xs text-sub">截图这张卡发给 TA，或点右上角分享文字版</div>
    </div>
  </div>
{/if}
