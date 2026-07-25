export type ThemePref = 'auto' | 'light' | 'dark'

const KEY = 'spitbill-theme'

export const theme = $state({
  pref: ((localStorage.getItem(KEY) as ThemePref) || 'auto') as ThemePref,
})

export function setTheme(pref: ThemePref) {
  theme.pref = pref
  localStorage.setItem(KEY, pref)
  apply()
}

function apply() {
  const root = document.documentElement
  if (theme.pref === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme.pref)
  // 同步 iOS 状态栏颜色
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    const dark =
      theme.pref === 'dark' ||
      (theme.pref === 'auto' && (m.getAttribute('media')?.includes('dark') ?? false))
    m.setAttribute('content', dark ? '#1c1915' : '#f7f1e6')
  }
}

apply()
