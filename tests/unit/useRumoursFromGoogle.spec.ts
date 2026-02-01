import { describe, it, expect } from 'vitest'

describe('useRumoursFromGoogle', () => {
  it('module exports useRumoursFromGoogle function', async () => {
    const module = await import('@/composables/useRumoursFromGoogle')
    expect(module.useRumoursFromGoogle).toBeDefined()
    expect(typeof module.useRumoursFromGoogle).toBe('function')
  })
})
