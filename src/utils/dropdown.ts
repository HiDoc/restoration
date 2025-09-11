import type { Directive } from 'vue'

export const dropdown: Directive = {
  mounted(el) {
    const header = el as HTMLElement
    const body = header.nextElementSibling as (HTMLElement | null)
    const icon = header.querySelector('.toggle-icon') as (HTMLElement | null)
    header.style.cursor = 'pointer'
    ;(header as any).__open = true
    const setState = (open: boolean) => {
      if (!body) return
      body.style.display = open ? '' : 'none'
      if (icon) icon.textContent = open ? '−' : '+'
      ;(header as any).__open = open
    }
    const onClick = () => setState(!(header as any).__open)
    header.addEventListener('click', onClick)
    ;(header as any).__dropdownCleanup = () => header.removeEventListener('click', onClick)
    setState(true)
  },
  unmounted(el) {
    const header = el as any
    if (header.__dropdownCleanup) header.__dropdownCleanup()
  }
}

