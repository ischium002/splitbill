<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    open,
    onOpenChange,
    onDelete,
    children,
  }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onDelete: () => void
    children: Snippet
  } = $props()

  /** 滑开后内容左移的距离：76px 删除钮 + 8px 缝 */
  const OPEN_X = -84

  let dragging = $state(false)
  let dragX = $state(0)
  let justDragged = false

  let startX = 0
  let startY = 0
  let baseX = 0
  // 方向锁：头几个像素判定是横滑（h，接管）还是竖滚（v，放行给页面），判完不再改
  let lock: 'idle' | 'h' | 'v' = 'idle'

  const x = $derived(dragging ? dragX : open ? OPEN_X : 0)

  function down(e: PointerEvent) {
    startX = e.clientX
    startY = e.clientY
    baseX = open ? OPEN_X : 0
    lock = 'idle'
  }

  function move(e: PointerEvent) {
    if (lock === 'v') return
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (lock === 'idle') {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        lock = 'v'
        return
      }
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        lock = 'h'
        dragging = true
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } else {
        return
      }
    }
    dragX = Math.min(0, Math.max(OPEN_X, baseX + dx))
  }

  function up() {
    if (lock === 'h') {
      justDragged = true
      setTimeout(() => (justDragged = false), 150)
      onOpenChange(dragX < OPEN_X / 2)
      dragging = false
    }
    lock = 'idle'
  }

  // 滑动结束后的 click 要吞掉，免得顺手触发卡片跳转；打开状态下点卡片 = 收回
  function clickCapture(e: MouseEvent) {
    if (justDragged) {
      justDragged = false
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (open) {
      e.preventDefault()
      e.stopPropagation()
      onOpenChange(false)
    }
  }
</script>

<div class="relative">
  <!-- 收起时彻底隐藏：半透明的卡片（如已结算 opacity 变灰）会把背后的红钮透出来 -->
  <button
    class="absolute inset-y-0 right-0 flex w-[76px] items-center justify-center rounded-3xl bg-neg text-sm font-bold text-white transition-opacity duration-150"
    style="opacity:{x === 0 ? 0 : 1};pointer-events:{x === 0 ? 'none' : 'auto'}"
    tabindex={open ? 0 : -1}
    onclick={onDelete}>删除</button
  >
  <div
    role="presentation"
    class="relative"
    style="transform:translateX({x}px);{dragging
      ? ''
      : 'transition:transform .22s ease'};touch-action:pan-y"
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
    onclickcapture={clickCapture}
  >
    {@render children()}
  </div>
</div>
