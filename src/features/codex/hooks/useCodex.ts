import { useCallback, useEffect, useRef, useState } from 'react'
import type { CodexSnapshot } from '../../../types'
import { desktopAvailable, loadCodex } from '../../../lib/desktop'
import { createQueuedRefresh } from '../services/queuedRefresh'

export function useCodex() {
  const [data, setData] = useState<CodexSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const desktop = desktopAvailable()
  const mounted = useRef(false)
  const runner = useRef<ReturnType<typeof createQueuedRefresh> | null>(null)

  if (!runner.current) {
    runner.current = createQueuedRefresh(async () => {
      if (!mounted.current) return
      setLoading(true)
      try {
        const next = await loadCodex()
        if (mounted.current) {
          setData(next)
          setError(null)
        }
      } catch (caught) {
        if (mounted.current) setError(caught instanceof Error ? caught.message : 'Gagal membaca sesi Codex')
      } finally {
        if (mounted.current) setLoading(false)
      }
    })
  }

  const refresh = useCallback(
    () => (desktop && mounted.current ? runner.current!.run() : Promise.resolve()),
    [desktop],
  )

  useEffect(() => {
    mounted.current = true
    void refresh()
    if (!desktop)
      return () => {
        mounted.current = false
      }
    const timer = window.setInterval(() => {
      void refresh()
    }, 90_000)
    return () => {
      mounted.current = false
      window.clearInterval(timer)
    }
  }, [desktop, refresh])

  return { data, loading, error, refresh, desktop }
}
