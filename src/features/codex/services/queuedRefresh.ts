/**
 * Single-flight refresh queue: never overlap loads, but do not lose a refresh
 * requested during an ongoing load (for example after changing Codex folder).
 * The callback handles its own errors so the queue can drain reliably.
 */
export function createQueuedRefresh(work: () => Promise<void>) {
  let pending: Promise<void> | null = null
  let rerun = false

  function run(): Promise<void> {
    if (pending) {
      rerun = true
      return pending
    }
    const task = (async () => {
      do {
        rerun = false
        await work()
      } while (rerun)
    })()
    pending = task.finally(() => {
      pending = null
    })
    return pending
  }

  return { run }
}
