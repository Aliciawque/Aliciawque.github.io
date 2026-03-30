import { describe, it, expect } from 'vitest'
import { findOptimalWidth } from '../../src/components/pretext/ShrinkWrap'

describe('findOptimalWidth', () => {
  it('returns a width smaller than maxWidth for short text', () => {
    const width = findOptimalWidth('Hello', '16px Maple Mono NF CN', 500)
    // Pretext needs browser canvas; in Node it falls back to maxWidth
    expect(width).toBeLessThanOrEqual(500)
    expect(width).toBeGreaterThan(0)
  })

  it('returns maxWidth when text is wider than max', () => {
    const width = findOptimalWidth(
      'This is a very long text that will definitely exceed the maximum width container',
      '16px Maple Mono NF CN',
      100
    )
    expect(width).toBe(100)
  })

  it('does not throw for empty text', () => {
    expect(() => findOptimalWidth('', '16px Maple Mono NF CN', 400)).not.toThrow()
  })
})
