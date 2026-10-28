import { describe, expect, it } from 'vitest'
import { DEFAULT_MASCOT, nextMascotExpression, normalizeMascot, parseMascotPreferences } from './mascot'

describe('Hana mascot preferences', () => {
  it('uses safe defaults for empty and malformed storage', () => {
    expect(parseMascotPreferences(null)).toEqual(DEFAULT_MASCOT)
    expect(parseMascotPreferences('{broken')).toEqual(DEFAULT_MASCOT)
  })

  it('validates expressions and enabled flag', () => {
    expect(normalizeMascot({ enabled: false, expression: 'thinking' })).toEqual({
      version: 1,
      enabled: false,
      expression: 'thinking',
    })
    expect(normalizeMascot({ enabled: 'yes', expression: 'untrusted-value' })).toEqual(DEFAULT_MASCOT)
  })

  it('advances through expressions and wraps around', () => {
    expect(nextMascotExpression('idle')).toBe('happy')
    expect(nextMascotExpression('surprised')).toBe('idle')
  })
})
