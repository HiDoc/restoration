export type ThemeName = 'system' | 'eco' | 'air'

const STORAGE_KEY = 'ecosim.theme'

let current: ThemeName = 'system'
let mql: MediaQueryList | null = null
let systemListener: ((e: MediaQueryListEvent) => void) | null = null

function getSystemTheme(): Exclude<ThemeName, 'system'> {
  if (typeof window === 'undefined' || typeof matchMedia === 'undefined') return 'eco'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'eco' : 'air'
}

function applyThemeClass(theme: Exclude<ThemeName, 'system'>) {
  const root = document.documentElement
  root.classList.remove('theme-eco', 'theme-air')
  root.classList.add(theme === 'eco' ? 'theme-eco' : 'theme-air')
}

export function setTheme(theme: ThemeName) {
  current = theme
  localStorage.setItem(STORAGE_KEY, theme)

  if (mql && systemListener) {
    mql.removeEventListener('change', systemListener)
    systemListener = null
  }

  if (theme === 'system') {
    // Apply current system theme
    const sys = getSystemTheme()
    applyThemeClass(sys)
    // Subscribe to changes
    if (typeof matchMedia !== 'undefined') {
      mql = window.matchMedia('(prefers-color-scheme: dark)')
      systemListener = () => applyThemeClass(getSystemTheme())
      mql.addEventListener('change', systemListener)
    }
  } else {
    applyThemeClass(theme)
  }
}

export function initTheme() {
  try {
    const saved = (localStorage.getItem(STORAGE_KEY) || 'system') as ThemeName
    setTheme(saved)
  } catch {
    setTheme('system')
  }
}

export function getTheme(): ThemeName {
  return current
}

