<script lang="ts">
  import { router, nav } from './lib/router.svelte'
  import { store, loadAll } from './lib/store.svelte'
  import ActivityList from './screens/ActivityList.svelte'
  import NewActivity from './screens/NewActivity.svelte'
  import ActivityHome from './screens/ActivityHome.svelte'
  import BillEdit from './screens/BillEdit.svelte'
  import DayView from './screens/DayView.svelte'
  import Settle from './screens/Settle.svelte'
  import MemberDetail from './screens/MemberDetail.svelte'
  import Settings from './screens/Settings.svelte'

  loadAll()

  const seg = $derived(router.path.split('/').filter(Boolean))
  const activity = $derived(
    seg[0] === 'a' && seg[1] ? store.activities.find((a) => a.id === seg[1]) : undefined
  )

  $effect(() => {
    // 活动被删或链接失效时回列表
    if (store.loaded && seg[0] === 'a' && !activity) nav('')
  })
</script>

<div class="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
  {#if !store.loaded}
    <div class="flex flex-1 items-center justify-center text-sm text-sub">…</div>
  {:else if seg[0] === 'new'}
    <NewActivity />
  {:else if seg[0] === 'settings'}
    <Settings />
  {:else if activity}
    {#if seg[2] === 'bill'}
      <BillEdit {activity} billId={seg[3] ?? ''} />
    {:else if seg[2] === 'days'}
      <DayView {activity} />
    {:else if seg[2] === 'settle'}
      <Settle {activity} />
    {:else if seg[2] === 'm'}
      <MemberDetail {activity} memberId={seg[3] ?? ''} />
    {:else}
      <ActivityHome {activity} />
    {/if}
  {:else}
    <ActivityList />
  {/if}
</div>
