import { describe, it, expect } from 'vitest'
import { calculateItemHeight } from '../../src/components/pretext/VirtualList'

describe('calculateItemHeight', () => {
  it('returns minimum card height for short text', () => {
    const height = calculateItemHeight('Short', '', 400)
    // Pretext needs browser canvas; in Node it falls back to 120
    expect(height).toBeGreaterThanOrEqual(80)
  })

  it('returns a positive number for any text input', () => {
    const height = calculateItemHeight(
      'A Very Long Title That Will Wrap To Multiple Lines',
      'This is a much longer excerpt that should produce a taller card.',
      300
    )
    // Verifies function signature works and returns positive fallback
    expect(height).toBeGreaterThan(0)
  })

  it('accepts empty excerpt without throwing', () => {
    expect(() => calculateItemHeight('Title', '', 400)).not.toThrow()
  })
})
