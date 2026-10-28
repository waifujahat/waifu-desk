import { useCallback, useEffect, useRef, useState } from 'react'
import type { GitHubData } from '../../../types'
import { readGithubCache, syncGithub, toGithubData } from '../services/githubService'

const VALID_USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/
const store = typeof localStorage === 'undefined' ? null : localStorage
const empty = (): GitHubData => ({ profile: null, repos: [], events: [], fetchedAt: 0, warnings: [] })
const fromCache = (username: string) => (store ? toGithubData(readGithubCache(store, username)) : empty())

type State = { username: string; data: GitHubData; loading: boolean; error: string | null }
type ActiveRequest = { username: string; controller: AbortController; promise: Promise<void> }

export function useGithub(username: string) {
  const name = username.trim().toLowerCase()
  const latestName = useRef(name)
  latestName.current = name
  const active = useRef<ActiveRequest | null>(null)
  const [state, setState] = useState<State>(() => ({
    username: name,
    data: fromCache(name),
    loading: false,
    error: null,
  }))

  const refresh = useCallback(
    (force = false): Promise<void> => {
      // A second click while the same request is running reuses its promise.
      if (active.current?.username === name && !active.current.controller.signal.aborted)
        return active.current.promise
      active.current?.controller.abort()
      if (!VALID_USERNAME.test(name)) {
        setState({ username: name, data: empty(), loading: false, error: 'Username GitHub tidak valid.' })
        return Promise.resolve()
      }
      const controller = new AbortController()
      setState((previous) => ({
        username: name,
        data: previous.username === name ? previous.data : fromCache(name),
        loading: true,
        error: null,
      }))
      const promise = (async () => {
        try {
          const result = await syncGithub(name, force, controller.signal, {
            store: store ?? { getItem: () => null, setItem: () => {} },
            fetcher: (input, init) => fetch(input, init),
          })
          if (!controller.signal.aborted && latestName.current === name) {
            setState({ username: name, data: result.data, loading: false, error: result.error })
          }
        } catch (caught) {
          if (!controller.signal.aborted && latestName.current === name) {
            setState((previous) => ({
              username: name,
              data: previous.username === name ? previous.data : fromCache(name),
              loading: false,
              error: caught instanceof Error ? caught.message : 'GitHub tidak dapat dihubungi.',
            }))
          }
        } finally {
          if (active.current?.controller === controller) active.current = null
        }
      })()
      active.current = { username: name, controller, promise }
      return promise
    },
    [name],
  )

  useEffect(() => {
    setState({ username: name, data: fromCache(name), loading: false, error: null })
    void refresh()
    return () => {
      // Cancel the old username request and prevent stale React commits.
      if (active.current?.username === name) {
        active.current.controller.abort()
        active.current = null
      }
    }
  }, [name, refresh])

  // During a username change render, don't expose the previous user's data.
  if (state.username !== name) {
    return { data: fromCache(name), loading: false, error: null, refresh }
  }
  return { data: state.data, loading: state.loading, error: state.error, refresh }
}
