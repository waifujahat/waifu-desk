import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from './Button';

describe('Button design-system primitive', () => {
  it('renders a native button that cannot submit a form accidentally', () => {
    const html = renderToStaticMarkup(<Button>Simpan</Button>);
    expect(html).toContain('type="button"');
    expect(html).toContain('wd-button--secondary');
    expect(html).toContain('Simpan');
  });

  it('disables and announces busy work', () => {
    const html = renderToStaticMarkup(<Button busy>Memuat</Button>);
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
  });

  it('supports explicit submit buttons and variants', () => {
    const html = renderToStaticMarkup(
      <Button type="submit" variant="primary">
        Kirim
      </Button>,
    );
    expect(html).toContain('type="submit"');
    expect(html).toContain('wd-button--primary');
  });
});
