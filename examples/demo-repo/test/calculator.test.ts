import { describe, expect, it } from 'vitest'
import { add, subtract } from '../src/calculator'

describe('calculator', () => {
  it('add は2数を加算する', () => {
    expect(add(2, 3)).toBe(5)
  })

  it('subtract は2数を減算する', () => {
    expect(subtract(5, 3)).toBe(2)
  })
})
