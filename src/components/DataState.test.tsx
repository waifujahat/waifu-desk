import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DataState } from './DataState'

describe('DataState', () => {
  it('explains missing data without inventing a numerical value', () => {
    const html = renderToStaticMarkup(<DataState title="Belum ada data" detail="Pilih folder Codex." />)
    expect(html).toContain('role="status"')
    expect(html).toContain('Belum ada data')
    expect(html).toContain('Pilih folder Codex.')
    expect(html).not.toContain('>0<')
  })

  it('only shows an action when provided', () => {
    const withoutAction = renderToStaticMarkup(<DataState title="Kosong" />)
    const withAction = renderToStaticMarkup(
      <DataState title="Kosong" action={<button type="button">Coba lagi</button>} />,
    )
    expect(withoutAction).not.toContain('wd-data-state-action')
    expect(withAction).toContain('wd-data-state-action')
    expect(withAction).toContain('Coba lagi')
  })
})
