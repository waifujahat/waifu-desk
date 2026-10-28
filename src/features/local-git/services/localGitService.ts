import { invoke, isTauri } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import type { LocalGitSnapshot } from '../domain/localGit'

export function localGitAvailable(): boolean {
  return isTauri()
}

/** Native dialog only: no folder path is entered or persisted by the web view. */
export async function selectLocalRepository(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false, title: 'Pilih root repository Git lokal' })
  return typeof result === 'string' ? result : null
}

export function inspectLocalRepository(path: string): Promise<LocalGitSnapshot> {
  return invoke<LocalGitSnapshot>('inspect_local_repository', { path })
}

export function previewReleaseNotes(path: string): Promise<string> {
  return invoke<string>('generate_release_notes', { path })
}
