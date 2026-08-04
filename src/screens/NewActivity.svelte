<script lang="ts">
  import { nav } from '../lib/router.svelte'
  import { addActivity } from '../lib/store.svelte'
  import { parseAmount, fmt, sym } from '../lib/money'
  import { memberColor, initialOf } from '../lib/members'
  import { uid } from '../lib/id'
  import Avatar from '../lib/Avatar.svelte'
  import type { Activity, Member } from '../lib/types'

  let step = $state(1)
  let name = $state('')
  let startDate = $state('')
  let endDate = $state('')

  let names = $state<string[]>([])
  let nameInput = $state('')

  let fundMode = $state<'uniform' | 'custom'>('uniform')
  let uniformStr = $state('300')
  let customStrs = $state<string[]>([])

  const previewMembers = $derived(
    names.map(
      (n, i): Member => ({
        id: String(i),
        name: n,
        ini: initialOf(n),
        color: memberColor(i),
        fundCents: 0,
      })
    )
  )

  const fundCentsList = $derived(
    names.map((_, i) =>
      fundMode === 'uniform' ? parseAmount(uniformStr) : parseAmount(customStrs[i] ?? '')
    )
  )
  const fundsValid = $derived(fundCentsList.length > 0 && fundCentsList.every((c) => c !== null))
  const fundSum = $derived(fundCentsList.reduce((s: number, c) => s + (c ?? 0), 0))

  function addName() {
    const t = nameInput.trim()
    if (!t) return
    names.push(t)
    customStrs.push(uniformStr)
    nameInput = ''
  }

  function removeName(i: number) {
    names.splice(i, 1)
    customStrs.splice(i, 1)
  }

  const canNext = $derived(
    step === 1 ? name.trim().length > 0 : step === 2 ? names.length >= 2 : fundsValid
  )

  function next() {
    if (!canNext) return
    if (step < 3) {
      step += 1
      return
    }
    const act: Activity = {
      id: uid(),
      name: name.trim(),
      startDate,
      endDate,
      members: names.map((n, i) => ({
        id: uid(),
        name: n,
        ini: initialOf(n),
        color: memberColor(i),
        fundCents: fundCentsList[i] ?? 0,
      })),
      bills: [],
      settled: false,
      createdAt: Date.now(),
    }
    addActivity(act)
    nav('a/' + act.id)
  }

  function prev() {
    if (step > 1) step -= 1
    else nav('')
  }
</script>

<div class="relative flex flex-1 flex-col pt-[env(safe-area-inset-top)]">
  <div class="flex items-center justify-between px-6 py-2.5">
    <button class="text-[15px] font-semibold text-accent" onclick={prev}>
      {step === 1 ? '‹ 取消' : '‹ 上一步'}
    </button>
    <div class="text-base font-bold">新建活动</div>
    <div class="w-[52px]"></div>
  </div>

  <div class="flex gap-1.5 px-6 pt-1.5">
    {#each [1, 2, 3] as s (s)}
      <div class="h-1 flex-1 rounded-sm {s <= step ? 'bg-accent' : 'bg-card2'}"></div>
    {/each}
  </div>

  {#if step === 1}
    <div class="px-6 pt-6 pb-2">
      <div class="text-[22px] font-extrabold">这次去哪儿玩？</div>
      <div class="mt-1 text-[13px] text-sub">起个名字，日期可以以后再补</div>
    </div>
    <div class="flex flex-col gap-3 px-6 pt-4">
      <input
        class="rounded-2xl border border-line bg-card px-4 py-3.5 text-base font-semibold placeholder:text-sub"
        placeholder="活动名称，如 日本自由行"
        bind:value={name}
      />
      <div class="flex items-center gap-2">
        <input
          type="date"
          class="min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 py-3 text-base"
          bind:value={startDate}
        />
        <span class="text-sub">–</span>
        <input
          type="date"
          class="min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 py-3 text-base"
          bind:value={endDate}
        />
      </div>
    </div>
  {:else if step === 2}
    <div class="px-6 pt-6 pb-2">
      <div class="text-[22px] font-extrabold">都有谁？</div>
      <div class="mt-1 text-[13px] text-sub">{name.trim()} · 至少 2 人</div>
    </div>
    <div class="flex gap-2 px-6 pt-4">
      <input
        class="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-3 text-base placeholder:text-sub"
        placeholder="名字，回车添加"
        bind:value={nameInput}
        onkeydown={(e) => e.key === 'Enter' && addName()}
      />
      <button
        class="h-12 flex-none rounded-full bg-accent px-5 text-[15px] font-bold text-white"
        onclick={addName}>添加</button
      >
    </div>
    <div class="flex flex-1 flex-col gap-2 px-6 pt-4 pb-40">
      {#each previewMembers as m, i (i)}
        <div class="flex items-center gap-3 rounded-[18px] border border-line bg-card px-4 py-3">
          <Avatar member={m} size={36} />
          <div class="flex-1 text-[15px] font-semibold">{m.name}</div>
          <button
            aria-label="移除 {m.name}"
            class="flex h-8 w-8 items-center justify-center rounded-full text-sub"
            onclick={() => removeName(i)}>✕</button
          >
        </div>
      {/each}
    </div>
  {:else}
    <div class="px-6 pt-6 pb-2">
      <div class="text-[22px] font-extrabold">每人交多少经费？</div>
      <div class="mt-1 text-[13px] text-sub">{name.trim()} · {names.length} 人</div>
    </div>
    <div class="flex gap-2 px-6 pt-2">
      <button
        class="rounded-full px-4 py-2 text-[13px] font-bold {fundMode === 'uniform'
          ? 'bg-accent text-white'
          : 'bg-card2 text-sub'}"
        onclick={() => (fundMode = 'uniform')}>统一金额</button
      >
      <button
        class="rounded-full px-4 py-2 text-[13px] font-bold {fundMode === 'custom'
          ? 'bg-accent text-white'
          : 'bg-card2 text-sub'}"
        onclick={() => (fundMode = 'custom')}>分别填写</button
      >
    </div>
    {#if fundMode === 'uniform'}
      <div class="flex items-center gap-2 px-6 pt-3">
        <span class="num text-lg font-bold text-sub">{sym()}</span>
        <input
          class="num w-32 rounded-2xl border border-line bg-card px-4 py-2.5 text-lg font-bold"
          inputmode="decimal"
          bind:value={uniformStr}
        />
        <span class="text-[13px] text-sub">/ 人</span>
      </div>
    {/if}
    <div class="flex flex-1 flex-col gap-2 px-6 pt-4 pb-40">
      {#each previewMembers as m, i (i)}
        <div class="flex items-center gap-3 rounded-[18px] border border-line bg-card px-4 py-3">
          <Avatar member={m} size={36} />
          <div class="flex-1 text-[15px] font-semibold">{m.name}</div>
          {#if fundMode === 'uniform'}
            <div class="num text-lg font-bold">
              {fundCentsList[i] !== null ? fmt(fundCentsList[i]!) : '—'}
            </div>
          {:else}
            <div class="flex items-center gap-1">
              <span class="num text-sm font-bold text-sub">{sym()}</span>
              <input
                class="num w-24 rounded-xl border border-line bg-bg px-3 py-2 text-right text-base font-bold"
                inputmode="decimal"
                bind:value={customStrs[i]}
              />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <div
    class="sticky bottom-0 flex flex-col gap-2 px-6 pt-3.5 pb-[max(env(safe-area-inset-bottom),10px)]"
    style="background:linear-gradient(transparent, var(--bg) 40%)"
  >
    {#if step === 3}
      <div class="num text-center text-[13px] text-sub">
        基金池合计 <span class="font-bold text-ink">{fmt(fundSum)}</span>
      </div>
    {/if}
    <button
      class="flex h-14 items-center justify-center rounded-full bg-accent text-base font-bold text-white disabled:opacity-40"
      disabled={!canNext}
      onclick={next}
    >
      {step === 3 ? '创建活动' : '下一步'}
    </button>
  </div>
</div>
