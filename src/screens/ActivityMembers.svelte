<script lang="ts">
  import { nav } from '../lib/router.svelte'
  import { persist } from '../lib/store.svelte'
  import { fmt, parseAmount, sym } from '../lib/money'
  import { initialOf, memberColor } from '../lib/members'
  import { uid } from '../lib/id'
  import Avatar from '../lib/Avatar.svelte'
  import type { Activity } from '../lib/types'

  let { activity }: { activity: Activity } = $props()

  let addingFundFor = $state<string | null>(null)
  let fundStr = $state('')
  let addingMember = $state(false)
  let newName = $state('')
  let newFundStr = $state('0')

  const fundCents = $derived(parseAmount(fundStr))
  const fundValid = $derived(fundCents !== null && fundCents > 0)
  const newFundCents = $derived(parseAmount(newFundStr))
  const memberValid = $derived(newName.trim().length > 0 && newFundCents !== null)

  function openFund(memberId: string) {
    addingFundFor = memberId
    fundStr = ''
    addingMember = false
  }

  function cancelFund() {
    addingFundFor = null
    fundStr = ''
  }

  function addFund(memberId: string) {
    if (!fundValid) return
    const member = activity.members.find((m) => m.id === memberId)
    if (!member) return
    member.fundCents += fundCents!
    persist(activity)
    cancelFund()
  }

  function openMember() {
    addingMember = true
    addingFundFor = null
    newName = ''
    newFundStr = '0'
  }

  function cancelMember() {
    addingMember = false
    newName = ''
    newFundStr = '0'
  }

  function addMember() {
    if (!memberValid) return
    const name = newName.trim()
    activity.members.push({
      id: uid(),
      name,
      ini: initialOf(name),
      color: memberColor(activity.members.length),
      fundCents: newFundCents!,
    })
    persist(activity)
    cancelMember()
  }
</script>

<div class="relative flex flex-1 flex-col pt-[env(safe-area-inset-top)]">
  <div class="flex items-center justify-between px-6 py-2.5">
    <button
      class="text-[15px] font-semibold text-accent"
      onclick={() => nav(`a/${activity.id}`)}>‹ 返回</button
    >
    <div class="text-base font-bold">成员与经费</div>
    <div class="w-[52px]"></div>
  </div>

  <div class="px-6 pt-5 pb-2">
    <div class="text-[22px] font-extrabold">{activity.members.length} 位成员</div>
    <div class="mt-1 text-[13px] text-sub">活动总经费 {fmt(activity.members.reduce((sum, m) => sum + m.fundCents, 0))}</div>
  </div>

  <div class="flex flex-1 flex-col gap-2 px-6 pt-4 pb-36">
    {#each activity.members as member (member.id)}
      <div class="rounded-[18px] border border-line bg-card px-4 py-3.5">
        <div class="flex items-center gap-3">
          <Avatar {member} size={40} />
          <div class="min-w-0 flex-1">
            <div class="truncate text-[15px] font-semibold">{member.name}</div>
            <div class="num mt-0.5 text-xs text-sub">已缴 {fmt(member.fundCents)}</div>
          </div>
          {#if addingFundFor !== member.id}
            <button
              class="rounded-full bg-accent-soft px-3.5 py-2 text-[13px] font-bold text-accent"
              onclick={() => openFund(member.id)}>追加经费</button
            >
          {/if}
        </div>

        {#if addingFundFor === member.id}
          <div class="mt-3 border-t border-line pt-3">
            <div class="mb-2 text-xs text-sub">给 {member.name} 追加</div>
            <div class="flex items-center gap-2">
              <div class="flex min-w-0 flex-1 items-center rounded-2xl bg-card2 px-3.5 py-2.5">
                <span class="num mr-1 text-sm font-bold text-sub">{sym()}</span>
                <input
                  class="num min-w-0 flex-1 bg-transparent text-lg font-bold placeholder:text-sub"
                  inputmode="decimal"
                  placeholder="0.00"
                  aria-label="追加经费金额"
                  bind:value={fundStr}
                  onkeydown={(e) => e.key === 'Enter' && fundValid && addFund(member.id)}
                />
              </div>
              <button class="px-2 py-2 text-[13px] font-semibold text-sub" onclick={cancelFund}
                >取消</button
              >
              <button
                class="rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
                disabled={!fundValid}
                onclick={() => addFund(member.id)}>确认</button
              >
            </div>
          </div>
        {/if}
      </div>
    {/each}

    {#if addingMember}
      <div class="mt-2 rounded-[20px] border-[1.5px] border-accent bg-card p-4">
        <div class="text-base font-bold">添加成员</div>
        <div class="mt-1 text-xs leading-5 text-sub">新成员只参与加入后的新账单，历史账单不会自动重算。</div>
        <div class="mt-4 flex flex-col gap-3">
          <input
            class="rounded-2xl border border-line bg-card2 px-4 py-3 text-base font-semibold placeholder:text-sub"
            placeholder="成员姓名"
            bind:value={newName}
          />
          <label class="flex items-center gap-2 rounded-2xl border border-line bg-card2 px-4 py-3">
            <span class="flex-1 text-sm text-sub">初始经费</span>
            <span class="num text-sm font-bold text-sub">{sym()}</span>
            <input
              class="num w-24 bg-transparent text-right text-base font-bold"
              inputmode="decimal"
              aria-label="新成员初始经费"
              bind:value={newFundStr}
              onkeydown={(e) => e.key === 'Enter' && memberValid && addMember()}
            />
          </label>
          <div class="flex gap-2">
            <button
              class="flex h-12 flex-1 items-center justify-center rounded-full bg-card2 text-sm font-semibold"
              onclick={cancelMember}>取消</button
            >
            <button
              class="flex h-12 flex-1 items-center justify-center rounded-full bg-accent text-sm font-bold text-white disabled:opacity-40"
              disabled={!memberValid}
              onclick={addMember}>添加</button
            >
          </div>
        </div>
      </div>
    {/if}
  </div>

  {#if !addingMember}
    <div
      class="sticky bottom-0 px-6 pt-4 pb-[max(env(safe-area-inset-bottom),10px)]"
      style="background:linear-gradient(transparent, var(--bg) 35%)"
    >
      <button
        class="flex h-14 w-full items-center justify-center rounded-full bg-accent text-base font-bold text-white shadow-[0_8px_20px_rgba(196,112,58,.28)]"
        onclick={openMember}>＋ 添加成员</button
      >
    </div>
  {/if}
</div>
