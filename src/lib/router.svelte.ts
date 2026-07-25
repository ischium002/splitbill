/** 极简 hash 路由：#/a/<id>/settle 这种。静态托管 + PWA 下最省事的方案。 */

function parse(): string {
  return location.hash.replace(/^#\/?/, '')
}

export const router = $state({ path: parse() })

window.addEventListener('hashchange', () => {
  router.path = parse()
})

export function nav(path: string) {
  location.hash = '#/' + path
}

export function back(fallback: string) {
  if (history.length > 1) history.back()
  else nav(fallback)
}
