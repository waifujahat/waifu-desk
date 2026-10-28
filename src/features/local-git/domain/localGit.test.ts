import { describe, expect, it } from 'vitest'
import { hiddenChangeCount, shortHash } from './localGit'

describe('local Git helpers', () => {
  it('shortens commit identifiers for display only', () => {
    expect(shortHash('84a9816bbc53038bc8585031a2021caa2bc3b0fe')).toBe('84a9816')
  })

  it('does not return negative hidden file counts', () => {
    expect(hiddenChangeCount(130, 100)).toBe(30)
    expect(hiddenChangeCount(2, 3)).toBe(0)
  })
})
