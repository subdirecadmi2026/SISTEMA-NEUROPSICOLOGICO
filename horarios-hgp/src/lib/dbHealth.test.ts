import { describe, expect, it } from 'vitest'
import { modeLabel } from './dbHealth'

describe('dbHealth labels', () => {
  it('traduce modos de enlace', () => {
    expect(modeLabel('table')).toBe('tabla')
    expect(modeLabel('bundle')).toBe('bundle')
    expect(modeLabel('local')).toBe('local')
    expect(modeLabel('error')).toBe('error')
  })
})
