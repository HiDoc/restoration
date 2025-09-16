import { describe, it, expect, beforeEach } from 'vitest'
import { setTheme, getTheme, initTheme } from '@/utils/theme'

// Minimal DOM and storage mocks
let classNames = new Set<string>()
const classList = {
  add: (...names: string[]) => names.forEach((n) => classNames.add(n)),
  remove: (...names: string[]) => names.forEach((n) => classNames.delete(n))
}

const storage = new Map<string, string>()

function installDom(mqlMatches = false) {
  classNames = new Set<string>()
  ;(globalThis as any).document = { documentElement: { classList } }
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
    setItem: (k: string, v: string) => void storage.set(k, v)
  }
  ;(globalThis as any).matchMedia = (query: string) => ({
    matches: mqlMatches,
    addEventListener: (_: string, __: any) => {},
    removeEventListener: (_: string, __: any) => {}
  })
  ;(globalThis as any).window = globalThis as any
}

function hasTheme(name: string) {
  return classNames.has(name)
}

describe('theme utils', () => {
  beforeEach(() => {
    storage.clear()
    installDom(false)
  })

  it('sets explicit theme classes', () => {
    setTheme('eco')
    expect(getTheme()).toBe('eco')
    expect(hasTheme('theme-eco')).toBe(true)
    expect(hasTheme('theme-air')).toBe(false)

    setTheme('air')
    expect(getTheme()).toBe('air')
    expect(hasTheme('theme-eco')).toBe(false)
    expect(hasTheme('theme-air')).toBe(true)
  })

  it('applies system theme using matchMedia', () => {
    installDom(true) // prefers dark → eco
    setTheme('system')
    expect(getTheme()).toBe('system')
    expect(hasTheme('theme-eco')).toBe(true)
    expect(hasTheme('theme-air')).toBe(false)

    installDom(false) // prefers light → air
    setTheme('system')
    expect(hasTheme('theme-air')).toBe(true)
  })

  it('initializes from localStorage', () => {
    storage.set('ecosim.theme', 'air')
    initTheme()
    expect(getTheme()).toBe('air')
    expect(hasTheme('theme-air')).toBe(true)
  })
})

