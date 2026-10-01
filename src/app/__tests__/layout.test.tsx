import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import RootLayout from '../layout';

// WalletProvider and RouteAnnouncer are already mocked in jest.setup.ts.
// Mock next/navigation for RouteAnnouncer's usePathname call and
// CommandPalette's useRouter call.
jest.mock('next/navigation', () => ({
  usePathname: jest.fn().mockReturnValue('/'),
  useRouter: jest.fn().mockReturnValue({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

function renderLayout() {
  return render(
    <RootLayout>
      <div>Page content</div>
    </RootLayout>
  );
}

describe('RootLayout — skip-to-content link', () => {
  it('renders a skip link with correct text', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toBeInTheDocument();
  });

  it('skip link targets #main-content', () => {
    renderLayout();
    const link = screen.getByRole('link', { name: /skip to main content/i });
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('skip link is visually hidden until focused', () => {
    renderLayout();
    const link = screen.getByRole('link', { name: /skip to main content/i });
    expect(link).toHaveClass('sr-only');
    expect(link.className).toMatch(/focus:not-sr-only/);
  });

  it('skip link is the first focusable element — appears before the header in the DOM', () => {
    const { container } = renderLayout();
    const focusables = container.querySelectorAll('a, button, [tabindex]');
    expect(focusables[0]).toHaveAttribute('href', '#main-content');
  });

  it('<main> has id="main-content" so the skip link target exists', () => {
    const { container } = renderLayout();
    expect(container.querySelector('main#main-content')).toBeInTheDocument();
  });

  it('<main> has tabIndex={-1} to accept programmatic focus', () => {
    const { container } = renderLayout();
    const main = container.querySelector('main#main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('has no axe accessibility violations on the skip link and main landmark', async () => {
    const { container } = renderLayout();
    // Scope axe to the inner wrapper that contains the skip link and main,
    // excluding the ToastProvider notification container which has pre-existing
    // aria-label-on-div violations unrelated to this change.
    const wrapper = container.querySelector('.min-h-screen') as HTMLElement;
    const results = await axe(wrapper ?? container);
    expect(results).toHaveNoViolations();
  });
});
