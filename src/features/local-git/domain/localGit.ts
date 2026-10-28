export interface LocalChangedFile {
  path: string
  status: string
}

export interface LocalCommit {
  hash: string
  summary: string
  author: string
  date: string
}

export interface LocalGitSnapshot {
  path: string
  name: string
  branch: string
  head: string | null
  total_changes: number
  files: LocalChangedFile[]
  commits: LocalCommit[]
}

export function shortHash(hash: string): string {
  return hash.slice(0, 7)
}

export function hiddenChangeCount(total: number, visible: number): number {
  return Math.max(0, total - visible)
}
