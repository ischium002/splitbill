<script lang="ts">
  import { back } from '../lib/router.svelte'
  import { store, exportBackup, importBackup, markExported } from '../lib/store.svelte'
  import { theme, setTheme, type ThemePref } from '../lib/theme.svelte'
  import { currency, setCurrency, CURRENCIES } from '../lib/currency.svelte'
  import { today, fmtDay } from '../lib/dates'
  import type { BackupFile } from '../lib/types'

  const themeOptions: [ThemePref, string][] = [
    ['auto', '跟随系统'],
    ['light', '浅色'],
    ['dark', '深色'],
  ]

  let fileInput: HTMLInputElement

  const lastExportLabel = $derived(
    store.lastExportAt ? fmtDay(store.lastExportAt.slice(0, 10)) : '还没导出过'
  )

  function doExport() {
    const data = exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `splitbill-backup-${today()}.json`
    a.click()
    URL.revokeObjectURL(url)
    markExported()
  }

  async function onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as BackupFile
      if ((data.app !== 'splitbill' && data.app !== 'spitbill') || !Array.isArray(data.activities)) {
        alert('这不是 splitbill 的备份文件')
        return
      }
      if (
        !confirm(
          `导入会用备份里的 ${data.activities.length} 个活动覆盖当前全部数据，确定吗？`
        )
      )
        return
      await importBackup(data)
      alert('导入完成')
    } catch {
      alert('文件读取失败，确认是 splitbill 导出的 JSON')
    } finally {
      fileInput.value = ''
    }
  }
</script>

<div class="flex flex-1 flex-col pt-[env(safe-area-inset-top)]">
  <div class="flex items-center justify-between px-6 py-2.5">
    <button class="text-[15px] font-semibold text-accent" onclick={() => back('')}>‹ 返回</button>
    <div class="text-base font-bold">设置</div>
    <div class="w-10"></div>
  </div>

  <div class="flex flex-col gap-3.5 px-6 py-3.5">
    <div class="flex items-start gap-3 rounded-[20px] bg-accent-soft px-[18px] py-4">
      <div
        class="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-accent text-base text-white"
      >
        ↓
      </div>
      <div class="flex-1">
        <div class="text-sm font-bold">记得备份</div>
        <div class="mt-1 text-xs leading-relaxed text-sub">
          数据只存在这台手机上。iOS 可能会清理长期不用的网页应用数据，建议每次出行结束后导出一份
          JSON 备份。
        </div>
        <div class="mt-2 text-[11px] text-sub">上次导出：{lastExportLabel}</div>
      </div>
    </div>

    <div class="overflow-hidden rounded-[20px] border border-line bg-card">
      <button
        class="flex w-full items-center justify-between border-b border-line px-[18px] py-4"
        onclick={doExport}
      >
        <div class="text-[15px] font-semibold">导出备份（JSON）</div>
        <div class="text-sub">›</div>
      </button>
      <button
        class="flex w-full items-center justify-between px-[18px] py-4"
        onclick={() => fileInput.click()}
      >
        <div class="text-[15px] font-semibold">导入备份</div>
        <div class="text-sub">›</div>
      </button>
      <input
        type="file"
        accept="application/json,.json"
        class="hidden"
        bind:this={fileInput}
        onchange={onFile}
      />
    </div>

    <div class="overflow-hidden rounded-[20px] border border-line bg-card">
      <div class="flex items-center justify-between border-b border-line px-[18px] py-3.5">
        <div class="text-[15px] font-semibold">外观</div>
        <div class="flex gap-1.5">
          {#each themeOptions as [val, label] (val)}
            <button
              class="rounded-full px-3 py-1.5 text-xs font-bold {theme.pref === val
                ? 'bg-accent text-white'
                : 'bg-card2 text-sub'}"
              onclick={() => setTheme(val)}>{label}</button
            >
          {/each}
        </div>
      </div>
      <div class="flex items-center justify-between border-b border-line px-[18px] py-3.5">
        <div class="text-[15px] font-semibold">货币符号</div>
        <div class="flex gap-1.5">
          {#each CURRENCIES as [s, name] (s)}
            <button
              class="num flex h-8 w-9 items-center justify-center rounded-full text-sm font-bold {currency.sym === s
                ? 'bg-accent text-white'
                : 'bg-card2 text-sub'}"
              title={name}
              aria-label={name}
              onclick={() => setCurrency(s)}>{s}</button
            >
          {/each}
        </div>
      </div>
      <div class="flex items-center justify-between px-[18px] py-4">
        <div class="text-[15px] font-semibold">关于</div>
        <div class="text-[13px] text-sub">splitbill 0.1</div>
      </div>
    </div>

    <div class="mt-2 text-center text-[11px] text-sub">ʕ·ᴥ·ʔ · splitbill</div>
  </div>
</div>
