import React from 'react';
import { render, screen, within } from '@testing-library/react';
import Breadcrumbs, { BreadcrumbItem } from '../Breadcrumbs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const THREE_CRUMBS: BreadcrumbItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Contracts', href: '/contracts' },
  { label: 'Contract #42' },
];

const TWO_CRUMBS: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Settings' },
];

const ONE_CRUMB: BreadcrumbItem[] = [{ label: 'Dashboard', href: '/' }];

// ---------------------------------------------------------------------------
// Structure & ARIA
// ---------------------------------------------------------------------------

describe('Breadcrumbs — structure and ARIA', () => {
  it('renders a <nav> with aria-label="Breadcrumb"', () => {
    render(<Breadcrumbs items={THREE_CRUMBS} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('contains an ordered list (<ol>) inside the nav', () => {
    const { container } = render(<Breadcrumbs items={THREE_CRUMBS} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav.querySelector('ol')).toBeInTheDocument();
    // ol must be a direct or nested child — confirm via container
    expect(container.querySelector('nav > ol')).toBeInTheDocument();
  });

  it('renders one <li> per breadcrumb item', () => {
    const { container } = render(<Breadcrumbs items={THREE_CRUMBS} />);
    const ol = container.querySelector('ol') as HTMLOListElement;
    expect(ol.querySelectorAll(':scope > li')).toHaveLength(THREE_CRUMBS.length);
  });

  it('renders nothing when items array is empty', () => {
    const { container } = render(<Breadcrumbs items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Link generation
// ---------------------------------------------------------------------------

describe('Breadcrumbs — link generation', () => {
  it('renders ancestor crumbs as links with correct hrefs', () => {
    render(<Breadcrumbs items={THREE_CRUMBS} />);

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const contractsLink = screen.getByRole('link', { name: 'Contracts' });

    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/');

    expect(contractsLink).toBeInTheDocument();
    expect(contractsLink).toHaveAttribute('href', '/contracts');
  });

  it('does not render the final crumb as a link', () => {
    render(<Breadcrumbs items={THREE_CRUMBS} />);
    // No <a> with text "Contract #42"
    expect(screen.queryByRole('link', { name: /Contract #42/i })).not.toBeInTheDocument();
    // The label must still be visible as text
    expect(screen.getByText('Contract #42')).toBeInTheDocument();
  });

  it('renders all links with their labels for two-crumb trail', () => {
    render(<Breadcrumbs items={TWO_CRUMBS} />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('single-crumb list renders the sole crumb without a link', () => {
    render(<Breadcrumbs items={ONE_CRUMB} />);
    // Even though it has an href, it is the final crumb — must not be a link
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// aria-current
// ---------------------------------------------------------------------------

describe('Breadcrumbs — aria-current', () => {
  it('applies aria-current="page" only to the final crumb', () => {
    render(<Breadcrumbs items={THREE_CRUMBS} />);

    const currentEl = screen.getByText('Contract #42');
    expect(currentEl).toHaveAttribute('aria-current', 'page');
  });

  it('does not apply aria-current to any ancestor crumb', () => {
    render(<Breadcrumbs items={THREE_CRUMBS} />);

    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Contracts' })).not.toHaveAttribute('aria-current');
  });

  it('applies aria-current="page" correctly in a two-crumb trail', () => {
    render(<Breadcrumbs items={TWO_CRUMBS} />);
    expect(screen.getByText('Settings')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('applies aria-current="page" to a single-crumb list', () => {
    render(<Breadcrumbs items={ONE_CRUMB} />);
    expect(screen.getByText('Dashboard')).toHaveAttribute('aria-current', 'page');
  });
});

// ---------------------------------------------------------------------------
// Separators
// ---------------------------------------------------------------------------

describe('Breadcrumbs — separators', () => {
  it('renders aria-hidden separators between crumbs', () => {
    const { container } = render(<Breadcrumbs items={THREE_CRUMBS} />);
    const separators = container.querySelectorAll('[aria-hidden="true"]');
    // 3 crumbs → 2 separators (one between each adjacent pair)
    expect(separators).toHaveLength(2);
  });

  it('renders no separator before the first crumb', () => {
    const { container } = render(<Breadcrumbs items={THREE_CRUMBS} />);
    const firstLi = container.querySelector('ol > li:first-child');
    expect(firstLi?.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Focus ring
// ---------------------------------------------------------------------------

describe('Breadcrumbs — focus ring', () => {
  it('applies the theme-token focus ring to ancestor links', () => {
    render(<Breadcrumbs items={THREE_CRUMBS} />);
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });

    expect(dashboardLink.className).toContain('focus-visible:ring-2');
    expect(dashboardLink.className).toContain('focus-visible:ring-[var(--ring)]');
    expect(dashboardLink.className).toContain('focus-visible:ring-offset-2');
  });

  it('does not use a hardcoded outline color for the focus ring', () => {
    // Regression guard: outline-blue-500 doesn't match --ring in light mode
    // (#2563eb) and was never theme-aware for dark mode either.
    render(<Breadcrumbs items={THREE_CRUMBS} />);
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });

    expect(dashboardLink.className).not.toContain('outline-blue-500');
  });

  it('applies the focus ring to every ancestor link, not just the first', () => {
    render(<Breadcrumbs items={THREE_CRUMBS} />);
    const contractsLink = screen.getByRole('link', { name: 'Contracts' });

    expect(contractsLink.className).toContain('focus-visible:ring-[var(--ring)]');
  });
});

// ---------------------------------------------------------------------------
// Dynamic label (contract id interpolation)
// ---------------------------------------------------------------------------

describe('Breadcrumbs — dynamic labels', () => {
  it('reflects the contract id in the final crumb label', () => {
    const id = 'abc-123';
    render(
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Contracts', href: '/contracts' },
          { label: `Contract #${id}` },
        ]}
      />,
    );

    const currentEl = screen.getByText(`Contract #${id}`);
    expect(currentEl).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: `Contract #${id}` })).not.toBeInTheDocument();
  });

  it('renders all three crumbs from the contract detail page scenario', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Contracts', href: '/contracts' },
          { label: 'Contract #99' },
        ]}
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Contracts' })).toBeInTheDocument();
    expect(within(nav).getByText('Contract #99')).toHaveAttribute('aria-current', 'page');
  });

  it('falls back to "/" for an ancestor crumb with no href', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Untitled' },
          { label: 'Current' },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Untitled' })).toHaveAttribute('href', '/');
  });
});

describe('Breadcrumbs — input invariants', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('omits the whole trail when an item is malformed at runtime', () => {
    const invalidItem = null as unknown as BreadcrumbItem;
    const { container } = render(
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, invalidItem]} />,
    );

    expect(container.firstChild).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      'Breadcrumbs received invalid items; navigation was omitted.',
    );
  });

  it('rejects sparse arrays instead of silently skipping missing entries', () => {
    const items = new Array(2) as BreadcrumbItem[];
    items[0] = { label: 'Home', href: '/' };
    const { container } = render(<Breadcrumbs items={items} />);

    expect(container.firstChild).toBeNull();
  });

  it('omits the whole trail when an ancestor has an unsafe URL scheme', () => {
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: 'Home', href: 'javascript:alert(1)' },
          { label: 'Current' },
        ]}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('preserves duplicate labels as separate ordered crumbs', () => {
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: 'Section', href: '/first' },
          { label: 'Section', href: '/second' },
          { label: 'Section' },
        ]}
      />,
    );

    expect(screen.getAllByText('Section')).toHaveLength(3);
    expect(container.querySelectorAll('ol > li')).toHaveLength(3);
    expect(screen.getAllByRole('link', { name: 'Section' })).toHaveLength(2);
    expect(screen.getByText('Section', { selector: '[aria-current="page"]' })).toBeInTheDocument();
  });
});
