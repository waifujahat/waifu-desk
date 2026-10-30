import { invoke, isTauri } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { CodexSnapshot } from '../types';

export interface CodexDirectory {
  path: string;
  source: string;
  available: boolean;
}

export function desktopAvailable(): boolean {
  return isTauri();
}

export function loadCodex(): Promise<CodexSnapshot> {
  return invoke<CodexSnapshot>('get_local_codex_usage');
}

export function getCodexDirectory(): Promise<CodexDirectory> {
  return invoke<CodexDirectory>('get_codex_directory');
}

/** Returns null if the user closes the native Windows folder picker. */
export async function pickCodexFolder(): Promise<string | null> {
  const path = await open({ directory: true, multiple: false, title: 'Pilih folder data Codex' });
  return typeof path === 'string' ? path : null;
}

export function setCodexDirectory(path: string): Promise<CodexDirectory> {
  return invoke<CodexDirectory>('set_codex_directory', { path });
}

export function resetCodexDirectory(): Promise<CodexDirectory> {
  return invoke<CodexDirectory>('reset_codex_directory');
}

export function toggleMini(): Promise<string> {
  return invoke<string>('toggle_compact_window');
}

export async function openTrusted(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') return;
    if (desktopAvailable()) await openUrl(parsed.href);
    else window.open(parsed.href, '_blank', 'noopener,noreferrer');
  } catch {
    /* Ignore untrusted or malformed links. */
  }
}
