import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// jsdom lacks these browser APIs; Headless UI's anchored menus and transitions call them.
if (typeof window !== 'undefined') {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.getAnimations ??= () => []
  Element.prototype.scrollIntoView ??= () => {}
}
