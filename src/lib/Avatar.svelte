<script lang="ts">
  import type { Member } from './types'

  let { member, size = 40, ring = false }: { member: Member; size?: number; ring?: boolean } =
    $props()
</script>

<div
  class="flex flex-none items-center justify-center rounded-full font-bold text-white select-none {ring
    ? 'border-2 border-card'
    : ''}"
  style="width:{size}px;height:{size}px;background:{member.color};font-size:{Math.round(
    size * 0.4
  )}px"
>
  {member.ini}
</div>
