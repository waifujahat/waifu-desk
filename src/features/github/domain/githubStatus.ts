export type GitHubSection = 'Profil' | 'Repositori' | 'Aktivitas'

/** GitHub requests settle independently; distinguish a missing result from a failed request. */
export function hasGithubFailure(warnings: string[], section: GitHubSection): boolean {
  return warnings.some((warning) => warning.startsWith(`${section}:`))
}

export function getGithubNotice(warnings: string[], error: string | null) {
  if (!warnings.length && !error) return null

  const combined = [...warnings, error ?? ''].join(' ').toLowerCase()
  if (combined.includes('membatasi') || combined.includes('429') || combined.includes('rate limit')) {
    return {
      title: 'Akses GitHub sedang dibatasi',
      description: 'Permintaan API mencapai batas. Coba lagi setelah batas diperbarui.',
    }
  }
  if (combined.includes('tidak ditemukan') || combined.includes('404')) {
    return {
      title: 'Data GitHub tidak ditemukan',
      description: 'Periksa username di Pengaturan.',
    }
  }
  return {
    title: 'Sebagian data GitHub gagal dimuat',
    description: 'Periksa koneksi atau coba perbarui data.',
  }
}
