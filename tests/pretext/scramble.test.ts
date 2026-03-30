import { describe, it, expect } from 'vitest'
import { scrambleStep } from '../../src/components/pretext/TextScramble'

describe('scrambleStep', () => {
  it('returns target text when progress is 1', () => {
    expect(scrambleStep('Hello', 1)).toBe('Hello')
  })

  it('returns all random chars when progress is 0', () => {
    const result = scrambleStep('Hello', 0)
    expect(result.length).toBe(5)
    expect(result).not.toBe('Hello')
  })

  it('progressively reveals characters', () => {
    const result = scrambleStep('Hello', 0.6)
    // First 3 chars should be revealed (0.6 * 5 = 3)
    expect(result.substring(0, 3)).toBe('Hel')
    expect(result.length).toBe(5)
  })
})
