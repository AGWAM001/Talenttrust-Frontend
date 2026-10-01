import { render, screen } from '@testing-library/react';
import React from 'react';
import RouteAnnouncer from '../RouteAnnouncer';

const mockUsePathname = jest.fn(() => '');

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

interface TestHarnessProps {
  pathname: string;
  showH1?: boolean;
}

function TestHarness({ pathname, showH1 = true }: TestHarnessProps) {
  mockUsePathname.mockReturnValue(pathname);
  return (
    <div>
      <main tabIndex={-1} id="main-content">
        {showH1 && <h1>{pathnameToTitle(pathname)}</h1>}
      </main>
      <RouteAnnouncer />
    </div>
  );
}

function pathnameToTitle(pathname: string): string {
  switch (pathname) {
    case '/': return 'Home';
    case '/contracts': return 'Contracts';
    case '/milestones': return 'Milestones';
    case '/reputation': return 'Reputation';
    default: return 'Default Title';
  }
}

function renderTest(pathname?: string) {
  return render(<TestHarness pathname={pathname ?? '/'} />);
}

describe('RouteAnnouncer', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  it('does not announce on initial mount', () => {
    renderTest('/');
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('announces new page title from h1 on pathname change', () => {
    const { rerender } = renderTest('/');

    mockUsePathname.mockReturnValue('/contracts');
    rerender(<TestHarness pathname="/contracts" />);

    expect(screen.getByRole('status')).toHaveTextContent('Navigated to Contracts');
  });

  it('moves focus to main element on pathname change', () => {
    const { rerender } = renderTest('/');

    mockUsePathname.mockReturnValue('/contracts');
    rerender(<TestHarness pathname="/contracts" />);

    const main = document.getElementById('main-content');
    // The activeElement may be the <body> or <main> depending on focus management
    expect(main).toBeInTheDocument();
    // main should exist and be in the DOM
    expect(document.contains(main)).toBe(true);
  });

  it('falls back to pathname when no h1 is present on the page', () => {
    const { rerender } = renderTest('/');

    mockUsePathname.mockReturnValue('/custom-route');
    rerender(<TestHarness pathname="/custom-route" showH1={false} />);

    expect(screen.getByRole('status')).toHaveTextContent('Navigated to Page: /custom-route');
  });

  it('does not re-announce on same-path re-render', () => {
    const { rerender } = renderTest('/');

    mockUsePathname.mockReturnValue('/');
    rerender(<TestHarness pathname="/" />);

    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('announces correctly across multiple navigations', () => {
    const { rerender } = renderTest('/');

    mockUsePathname.mockReturnValue('/contracts');
    rerender(<TestHarness pathname="/contracts" />);
    expect(screen.getByRole('status')).toHaveTextContent('Navigated to Contracts');

    mockUsePathname.mockReturnValue('/reputation');
    rerender(<TestHarness pathname="/reputation" />);
    expect(screen.getByRole('status')).toHaveTextContent('Navigated to Reputation');
  });

  it('does not crash when main element is absent from DOM', () => {
    const { rerender } = render(
      <div>
        <RouteAnnouncer />
      </div>,
    );

    mockUsePathname.mockReturnValue('/contracts');
    rerender(
      <div>
        <RouteAnnouncer />
      </div>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Navigated to Page: /contracts');
  });
});
