<script lang="ts">
  import { nav } from '../lib/router.svelte'
  import { persist } from '../lib/store.svelte'
  import { fmt, sym, parseAmount, centsToInput } from '../lib/money'
  import { today, fmtDay } from '../lib/dates'
  import { uid } from '../lib/id'
  import Avatar from '../lib/Avatar.svelte'
  import type { Activity, Bill, BillItem, ItemKind } from '../lib/types'

  let { activity, billId }: { activity: Activity; billId: string } = $props()

  const editing = activity.bills.find((b) => b.id === billId)

  let date = $state(editing?.date ?? today())
  let title = $state(editing?.title ?? '')
  let totalStr = $state(editing && editing.totalCents > 0 ? centsToInput(editing.totalCents) : '')
  let items = $state<BillItem[]>(
    editing ? (structuredClone($state.snapshot(editing.items)) as BillItem[]) : []
  )

  // 明细编辑器
  let cLabel = $state('')
  let cAmount = $state('')
  let cKind = $state<ItemKind>('shared')
  let cSel = $state<string[]>(activity.members.map((m) => m.id))
  let composerEl = $state<HTMLElement>()
  let totalEl = $state<HTMLInputElement>()
  let cLabelEl = $state<HTMLInputElement>()
  let cAmountEl = $state<HTMLInputElement>()

  /** 回车流转：标题→总额→明细名目→明细金额→添加并回到名目，连续录入 */
  function enterTo(next: HTMLInputElement | undefined) {
    return (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      next?.focus()
    }
  }

  function amountEnter(e: KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (!composerValid) return
    addItem(true)
    cLabelEl?.focus()
  }

  /** 挂在按钮的 pointerdown 上：不抢输入框的焦点，键盘就不会收起（click 照常触发） */
  function keepFocus(e: PointerEvent) {
    e.preventDefault()
  }

  /** 键盘弹出后把 composer 滚到可见区，等键盘动画走完再滚 */
  function composerFocus() {
    setTimeout(() => composerEl?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
  }

  const allocated = $derived(items.reduce((s, it) => s + it.amountCents, 0))
  const totalCents = $derived(parseAmount(totalStr) ?? 0)
  const diff = $derived(totalCents - allocated)
  const cAmountCents = $derived(parseAmount(cAmount))
  const composerValid = $derived(cAmountCents !== null && cAmountCents > 0 && cSel.length > 0)

  function setKind(k: ItemKind) {
    if (k === cKind) return
    cKind = k
    cSel = k === 'shared' ? activity.members.map((m) => m.id) : []
  }

  function tapChip(id: string) {
    if (cKind === 'personal') {
      cSel = [id]
      return
    }
    if (cSel.includes(id)) {
      if (cSel.length > 1) cSel = cSel.filter((x) => x !== id)
    } else {
      cSel = [...cSel, id]
    }
  }

  function addItem(keepKeyboard = false) {
    if (!composerValid) return
    // 这里才收键盘（iOS 点按钮不会自动让输入框失焦）；回车连续录入时不收
    if (!keepKeyboard) (document.activeElement as HTMLElement | null)?.blur()
    items.push({
      id: uid(),
      label: cLabel.trim() || '明细',
      amountCents: cAmountCents!,
      kind: cKind,
      memberIds: [...cSel],
    })
    cLabel = ''
    cAmount = ''
    cKind = 'shared'
    cSel = activity.members.map((m) => m.id)
  }

  function editItem(i: number) {
    const it = items[i]
    cLabel = it.label
    cAmount = centsToInput(it.amountCents)
    cKind = it.kind
    cSel = [...it.memberIds]
    items.splice(i, 1)
  }

  function removeItem(i: number) {
    items.splice(i, 1)
  }

  function itemMeta(it: BillItem): string {
    if (it.kind === 'personal') {
      const m = activity.members.find((mm) => mm.id === it.memberIds[0])
      return `个人 · ${m?.name ?? '?'}`
    }
    return it.memberIds.length === activity.members.length
      ? '共享 · 全员'
      : `共享 · ${it.memberIds.length} 人`
  }

  function save() {
    // composer 里填好但没点"添加"的内容，保存时顺手收进来
    if (composerValid) addItem()
    if (items.length === 0) {
      if (totalCents > 0) {
        // 快速记一笔：只填总额（如打车 10 块）→ 自动生成一条全员均摊
        items.push({
          id: uid(),
          label: title.trim() || '合计',
          amountCents: totalCents,
          kind: 'shared',
          memberIds: activity.members.map((m) => m.id),
        })
      } else {
        alert('还没有任何明细。小额账单可以只填总额直接保存，会按全员均摊记一条')
        return
      }
    }
    if (totalCents > 0 && diff !== 0) {
      const word = diff > 0 ? '还差' : '超出'
      if (
        !confirm(`已录明细合计 ${fmt(allocated)}，和账单总额${word} ${fmt(Math.abs(diff))}。仍要保存吗？`)
      )
        return
    }
    const bill: Bill = {
      id: editing?.id ?? uid(),
      date,
      title: title.trim() || '未命名账单',
      totalCents,
      items: structuredClone($state.snapshot(items)) as BillItem[],
      createdAt: editing?.createdAt ?? Date.now(),
    }
    if (editing) {
      const i = activity.bills.findIndex((b) => b.id === editing.id)
      activity.bills[i] = bill
    } else {
      activity.bills.push(bill)
    }
    persist(activity)
    nav(`a/${activity.id}`)
  }

  function delBill() {
    if (!editing) return
    if (!confirm(`删除这笔「${editing.title}」？`)) return
    activity.bills = activity.bills.filter((b) => b.id !== editing.id)
    persist(activity)
    nav(`a/${activity.id}/days`)
  }
</script>

<div class="relative flex flex-1 flex-col pt-[env(safe-area-inset-top)]">
  <div class="flex items-center justify-between px-6 py-2.5">
    <button class="text-[15px] font-semibold text-accent" onclick={() => nav(`a/${activity.id}`)}
      >‹ {editing ? '返回' : '取消'}</button
    >
    <div class="text-base font-bold">{editing ? '改一笔' : '记一笔'}</div>
    {#if editing}
      <button class="text-[15px] font-semibold text-neg" onclick={delBill}>删除</button>
    {:else}
      <div class="w-10"></div>
    {/if}
  </div>

  <div class="flex gap-2 px-6 py-1.5">
    <label
      class="relative flex flex-none items-center rounded-full bg-card2 px-3.5 py-2 text-[13px] font-semibold"
    >
      {fmtDay(date)} ▾
      <input
        type="date"
        class="absolute inset-0 opacity-0"
        bind:value={date}
        aria-label="账单日期"
      />
    </label>
    <input
      class="min-w-0 flex-1 rounded-full bg-card2 px-3.5 py-1.5 text-base font-semibold placeholder:text-sub"
      placeholder="商家 / 名目，如 一兰拉面"
      enterkeyhint="next"
      bind:value={title}
      onkeydown={enterTo(totalEl)}
    />
  </div>

  <div class="px-6 pt-4 pb-2.5 text-center">
    <div class="text-xs text-sub">账单总额（选填，用来核对）</div>
    <div class="mt-0.5 inline-flex items-baseline border-b-2 border-accent px-3 pb-1">
      <span class="num text-3xl font-bold text-sub">{sym()}</span>
      <input
        class="num w-40 bg-transparent text-center text-[44px] font-bold tracking-[-0.5px] placeholder:text-sub"
        inputmode="decimal"
        placeholder="0.00"
        enterkeyhint="next"
        bind:this={totalEl}
        bind:value={totalStr}
        onkeydown={enterTo(cLabelEl)}
      />
    </div>
  </div>

  <div class="flex flex-1 flex-col gap-2 px-6 pt-2 pb-56">
    {#each items as it, i (it.id)}
      <div class="flex items-center gap-2.5 rounded-2xl border border-line bg-card px-3.5 py-3">
        <button class="min-w-0 flex-1 text-left" onclick={() => editItem(i)}>
          <div class="truncate text-sm font-semibold">{it.label}</div>
          <div class="mt-0.5 text-[11px] text-sub">{itemMeta(it)}</div>
        </button>
        <div class="num text-[15px] font-bold">{fmt(it.amountCents)}</div>
        <button
          aria-label="删除明细"
          class="flex h-7 w-7 flex-none items-center justify-center rounded-full text-sub"
          onclick={() => removeItem(i)}>✕</button
        >
      </div>
    {/each}

    <div
      class="flex flex-col gap-2.5 rounded-[18px] border-[1.5px] border-accent bg-card p-3.5"
      bind:this={composerEl}
    >
      <div class="flex items-center gap-2">
        <input
          class="min-w-0 flex-1 bg-transparent text-base placeholder:text-sub"
          placeholder="名目（如 啤酒）"
          enterkeyhint="next"
          bind:this={cLabelEl}
          bind:value={cLabel}
          onfocus={composerFocus}
          onkeydown={enterTo(cAmountEl)}
        />
        <div class="flex items-baseline gap-0.5">
          <span class="num text-base font-bold text-sub">{sym()}</span>
          <input
            class="num w-20 bg-transparent text-right text-xl font-bold placeholder:text-sub"
            inputmode="decimal"
            placeholder="0.00"
            enterkeyhint="done"
            bind:this={cAmountEl}
            bind:value={cAmount}
            onfocus={composerFocus}
            onkeydown={amountEnter}
          />
        </div>
      </div>
      <div class="flex gap-1.5">
        <button
          class="rounded-full border-2 px-4 py-[7px] text-xs font-bold {cKind === 'shared'
            ? 'border-accent bg-accent text-white'
            : 'border-line bg-card2 text-sub'}"
          onpointerdown={keepFocus}
          onclick={() => setKind('shared')}>共享 · 均摊</button
        >
        <button
          class="rounded-full border-2 px-4 py-[7px] text-xs font-bold {cKind === 'personal'
            ? 'border-accent bg-accent text-white'
            : 'border-line bg-card2 text-sub'}"
          onpointerdown={keepFocus}
          onclick={() => setKind('personal')}>个人 · 归一人</button
        >
      </div>
      <div class="flex flex-wrap gap-1.5">
        {#each activity.members as m (m.id)}
          {@const on = cSel.includes(m.id)}
          <button
            class="flex items-center gap-1.5 rounded-full border-2 py-1.5 pr-3 pl-1.5 text-xs font-bold {on
              ? 'border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent)]'
              : 'border-line bg-card text-sub'}"
            onpointerdown={keepFocus}
            onclick={() => tapChip(m.id)}
          >
            <Avatar member={m} size={20} />{m.name}{on ? ' ✓' : ''}
          </button>
        {/each}
      </div>
      {#if cKind === 'personal' && cSel.length === 0}
        <div class="text-[11px] text-sub">选一个人：这条算谁的</div>
      {/if}
      <button
        class="flex h-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-white disabled:opacity-40"
        disabled={!composerValid}
        onclick={() => addItem()}>＋ 添加明细</button
      >
    </div>
  </div>

  <div
    class="sticky bottom-0 flex flex-col gap-2.5 px-6 pt-3 pb-[max(env(safe-area-inset-bottom),10px)]"
    style="background:linear-gradient(transparent, var(--bg) 30%)"
  >
    <div
      class="flex items-center justify-between rounded-[14px] px-4 py-[11px] {totalCents > 0 &&
      diff !== 0
        ? 'bg-accent-soft'
        : 'bg-card2'}"
    >
      {#if items.length === 0 && totalCents > 0 && !composerValid}
        <div class="num text-[13px]">保存将按全员均摊记一条 {fmt(totalCents)}</div>
      {:else}
        <div class="num text-[13px]">
          已录 {fmt(allocated)}{totalCents > 0 ? ` / 账单 ${fmt(totalCents)}` : ''}
        </div>
        {#if totalCents > 0}
          <div class="num text-[13px] font-bold {diff === 0 ? 'text-pos' : 'text-accent'}">
            {diff === 0 ? '正好对上 ✓' : diff > 0 ? `还差 ${fmt(diff)}` : `超出 ${fmt(-diff)}`}
          </div>
        {/if}
      {/if}
    </div>
    <button
      class="flex h-14 items-center justify-center rounded-full bg-accent text-base font-bold text-white"
      onclick={save}>保存账单</button
    >
    {#if totalCents > 0 && diff !== 0 && items.length > 0}
      <div class="text-center text-[11px] text-sub">有差值时保存会再确认一次</div>
    {/if}
  </div>
</div>
