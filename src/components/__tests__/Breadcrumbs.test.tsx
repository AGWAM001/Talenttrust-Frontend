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

  it('exposes a data-testid="breadcrumbs" attribute for targeted test selectors', () => {
    render(<Breadcrumbs items={THREE_CRUMBS} />);
    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
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

// ---------------------------------------------------------------------------
// Boundary — null / undefined entries (runtime safety)
// ---------------------------------------------------------------------------

describe('Breadcrumbs — null/undefined item entries', () => {
  it('silently drops null entries and still renders valid items', () => {
    // TypeScript would flag this, but runtime data from APIs can bypass types.
    const items = [
      { label: 'Dashboard', href: '/' },
      null,
      { label: 'Current' },
    ] as unknown as BreadcrumbItem[];

    render(<Breadcrumbs items={items} />);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Current')).toHaveAttribute('aria-current', 'page');
    // Only 2 valid items → 1 separator
    const { container } = render(<Breadcrumbs items={items} />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
  });

  it('silently drops undefined entries and still renders valid items', () => {
    const items = [
      undefined,
      { label: 'Contracts', href: '/contracts' },
      { label: 'Current' },
    ] as unknown as BreadcrumbItem[];

    render(<Breadcrumbs items={items} />);

    expect(screen.getByRole('link', { name: 'Contracts' })).toBeInTheDocument();
    expect(screen.getByText('Current')).toHaveAttribute('aria-current', 'page');
  });

  it('returns null when every entry is null or undefined', () => {
    const items = [null, undefined, null] as unknown as BreadcrumbItem[];
    const { container } = render(<Breadcrumbs items={items} />);
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Boundary — empty / whitespace-only labels
// ---------------------------------------------------------------------------

describe('Breadcrumbs — empty and whitespace-only labels', () => {
  it('drops an item with an empty string label', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: '' },
          { label: 'Current' },
        ]}
      />,
    );

    // Only Dashboard and Current survive
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: '' },
          { label: 'Current' },
        ]}
      />,
    );
    expect(container.querySelector('ol')!.querySelectorAll(':scope > li')).toHaveLength(2);
  });

  it('drops an item with a whitespace-only label', () => {
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: '   ' },
          { label: 'Page' },
        ]}
      />,
    );
    expect(container.querySelector('ol')!.querySelectorAll(':scope > li')).toHaveLength(2);
  });

  it('trims surrounding whitespace from a label before rendering', () => {
    render(
      <Breadcrumbs
        items={[
          { label: '  Dashboard  ', href: '/' },
          { label: '  Current  ' },
        ]}
      />,
    );

    // The rendered text should be the trimmed version
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Current')).toHaveAttribute('aria-current', 'page');
  });

  it('returns null when every item has a blank label', () => {
    const { container } = render(
      <Breadcrumbs items={[{ label: '' }, { label: '   ' }, { label: '\t' }]} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Boundary — duplicate items (deduplication)
// ---------------------------------------------------------------------------

describe('Breadcrumbs — consecutive duplicate deduplication', () => {
  it('drops a consecutive duplicate item (same label + same href)', () => {
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Home', href: '/' }, // duplicate
          { label: 'Current' },
        ]}
      />,
    );

    // Only 2 items after deduplication: Home and Current
    expect(container.querySelector('ol')!.querySelectorAll(':scope > li')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Home' })).toHaveLength(1);
  });

  it('keeps non-consecutive duplicates intact', () => {
    // Home → Contracts → Home (intentional loop) → Current
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Contracts', href: '/contracts' },
          { label: 'Home', href: '/' },
          { label: 'Current' },
        ]}
      />,
    );

    // All 4 items should be preserved — only consecutive duplicates are dropped
    expect(container.querySelector('ol')!.querySelectorAll(':scope > li')).toHaveLength(4);
  });

  it('keeps items with the same label but different hrefs (they are distinct)', () => {
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: 'Section', href: '/a' },
          { label: 'Section', href: '/b' },
          { label: 'Current' },
        ]}
      />,
    );

    expect(container.querySelector('ol')!.querySelectorAll(':scope > li')).toHaveLength(3);
  });

  it('renders an empty result when all items are the same consecutive duplicate', () => {
    // After deduplication: only one item remains
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: 'Only', href: '/only' },
          { label: 'Only', href: '/only' },
          { label: 'Only', href: '/only' },
        ]}
      />,
    );

    // 3 identical consecutive crumbs → deduped to 1 → single final crumb rendered
    expect(container.querySelector('ol')!.querySelectorAll(':scope > li')).toHaveLength(1);
    expect(screen.getByText('Only')).toHaveAttribute('aria-current', 'page');
  });
});

// ---------------------------------------------------------------------------
// Boundary — extremely long labels
// ---------------------------------------------------------------------------

describe('Breadcrumbs — long labels', () => {
  it('renders a very long label without throwing', () => {
    const longLabel = 'A'.repeat(500);
    expect(() =>
      render(
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: longLabel },
          ]}
        />,
      ),
    ).not.toThrow();
  });

  it('applies truncation class to both link and current-page crumbs', () => {
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: 'A'.repeat(300), href: '/' },
          { label: 'B'.repeat(300) },
        ]}
      />,
    );

    const link = container.querySelector('a');
    const current = container.querySelector('[aria-current="page"]');

    expect(link?.className).toContain('truncate');
    expect(current?.className).toContain('truncate');
  });
});

// ---------------------------------------------------------------------------
// Adversarial — XSS / special characters in labels
// ---------------------------------------------------------------------------

describe('Breadcrumbs — XSS and special characters', () => {
  it('renders HTML special characters as escaped text, not as markup', () => {
    render(
      <Breadcrumbs
        items={[
          { label: '<script>alert("xss")</script>', href: '/' },
          { label: 'Current' },
        ]}
      />,
    );

    // React escapes the content — no script tag should exist in the DOM
    const link = screen.getByRole('link', { name: /<script>alert\("xss"\)<\/script>/ });
    expect(link).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });

  it('renders labels with angle brackets as literal text', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'A > B & C' },
        ]}
      />,
    );

    expect(screen.getByText('A > B & C')).toHaveAttribute('aria-current', 'page');
  });

  it('does not use dangerouslySetInnerHTML for label rendering', () => {
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: 'Safe', href: '/' },
          { label: '<b>Bold</b>' },
        ]}
      />,
    );

    // If dangerouslySetInnerHTML were used, a <b> element would appear
    expect(container.querySelector('b')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Adversarial — href injection
// ---------------------------------------------------------------------------

describe('Breadcrumbs — href safety', () => {
  it('renders a javascript: href as given (Next.js Link responsibility)', () => {
    // The Breadcrumbs component does not sanitize hrefs — this is intentionally
    // delegated to Next.js Link and the browser. This test documents the
    // current contract so a future change that does add sanitization is
    // conscious rather than accidental.
    render(
      <Breadcrumbs
        items={[
          // eslint-disable-next-line no-script-url
          { label: 'Malicious', href: 'javascript:void(0)' },
          { label: 'Current' },
        ]}
      />,
    );

    const link = screen.getByRole('link', { name: 'Malicious' });
    // Current behaviour: passed through to Next.js Link unchanged.
    expect(link).toBeInTheDocument();
  });

  it('falls back to "/" for an ancestor crumb with href=undefined', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'Ancestor', href: undefined },
          { label: 'Current' },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Ancestor' })).toHaveAttribute('href', '/');
  });
});

// ---------------------------------------------------------------------------
// Regression — prop-change stability (re-render without remount)
// ---------------------------------------------------------------------------

describe('Breadcrumbs — re-render stability', () => {
  it('updates rendered crumbs when items prop changes', () => {
    const { rerender } = render(
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Old Page' }]} />,
    );

    expect(screen.getByText('Old Page')).toHaveAttribute('aria-current', 'page');

    rerender(
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'New Page' }]} />,
    );

    expect(screen.queryByText('Old Page')).not.toBeInTheDocument();
    expect(screen.getByText('New Page')).toHaveAttribute('aria-current', 'page');
  });

  it('collapses to null when items prop changes to an empty array', () => {
    const { rerender, container } = render(
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Page' }]} />,
    );

    expect(screen.getByRole('navigation')).toBeInTheDocument();

    rerender(<Breadcrumbs items={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('recovers and renders correctly when items prop changes from empty to valid', () => {
    const { rerender } = render(<Breadcrumbs items={[]} />);

    rerender(
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Recovered' },
        ]}
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('Recovered')).toHaveAttribute('aria-current', 'page');
  });
});

// ---------------------------------------------------------------------------
// Regression — key stability and separator count integrity after filtering
// ---------------------------------------------------------------------------

describe('Breadcrumbs — separator count after filtering', () => {
  it('has exactly (n - 1) separators for n valid items after filtering nulls', () => {
    const items = [
      { label: 'A', href: '/a' },
      null,
      { label: 'B', href: '/b' },
      null,
      { label: 'C' },
    ] as unknown as BreadcrumbItem[];

    const { container } = render(<Breadcrumbs items={items} />);
    // 3 valid items → 2 separators
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it('has exactly (n - 1) separators for n items after whitespace filtering', () => {
    const { container } = render(
      <Breadcrumbs
        items={[
          { label: 'A', href: '/a' },
          { label: '   ' },
          { label: 'B', href: '/b' },
          { label: '' },
          { label: 'C' },
        ]}
      />,
    );
    // 3 valid items → 2 separators
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Compatibility — existing caller contract (contracts/[id] page)
// ---------------------------------------------------------------------------

describe('Breadcrumbs — contracts page caller compatibility', () => {
  it('renders the standard contracts detail breadcrumb trail unchanged', () => {
    const id = 'contract-xyz';
    render(
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/' },
          { label: 'Contracts', href: '/contracts' },
          { label: `#${id}` },
        ]}
      />,
    );

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
    expect(within(nav).getByRole('link', { name: 'Contracts' })).toHaveAttribute(
      'href',
      '/contracts',
    );
    expect(within(nav).getByText(`#${id}`)).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('link', { name: `#${id}` })).not.toBeInTheDocument();
  });
});
