import { describe, expect, it } from 'vitest'
import { createQueuedRefresh } from './queuedRefresh'

describe('queued Codex refresh', () => {
  it('coalesces concurrent calls into one pending request and one follow-up', async () => {
    let runs = 0
    let concurrent = 0
    let maxConcurrent = 0
    const completions: Array<() => void> = []
    const queue = createQueuedRefresh(async () => {
      runs++
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise<void>((resolve) => {
        completions.push(resolve)
      })
      concurrent--
    })
    const initial = queue.run()
    const second = queue.run()
    const third = queue.run()
    expect(runs).toBe(1)
    expect(initial).toBe(second)
    expect(second).toBe(third)
    completions.shift()!()
    for (let i = 0; i < 10 && runs < 2; i++) await Promise.resolve()
    expect(runs).toBe(2)
    completions.shift()!()
    await initial
    expect(maxConcurrent).toBe(1)
    expect(runs).toBe(2)
  })

  it('can retry after a failed refresh', async () => {
    let attempt = 0
    const queue = createQueuedRefresh(async () => {
      if (++attempt === 1) throw new Error('temporary')
    })
    await expect(queue.run()).rejects.toThrow('temporary')
    await expect(queue.run()).resolves.toBeUndefined()
    expect(attempt).toBe(2)
  })
})
