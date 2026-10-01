import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Navbar from '../Navbar';

expect.extend(toHaveNoViolations);

// Mock next/navigation usePathname
const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('Navbar', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation links to /contracts, /milestones, and /reputation', () => {
    render(<Navbar />);

    expect(screen.getByRole('link', { name: 'Contracts' })).toHaveAttribute('href', '/contracts');
    expect(screen.getByRole('link', { name: 'Milestones' })).toHaveAttribute('href', '/milestones');
    expect(screen.getByRole('link', { name: 'Reputation' })).toHaveAttribute('href', '/reputation');
  });

  it('marks the current route with aria-current="page"', () => {
    mockUsePathname.mockReturnValue('/contracts');
    render(<Navbar />);

    const contractsLink = screen.getByRole('link', { name: 'Contracts' });
    expect(contractsLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark inactive routes with aria-current', () => {
    mockUsePathname.mockReturnValue('/contracts');
    render(<Navbar />);

    const milestonesLink = screen.getByRole('link', { name: 'Milestones' });
    const reputationLink = screen.getByRole('link', { name: 'Reputation' });

    expect(milestonesLink).not.toHaveAttribute('aria-current');
    expect(reputationLink).not.toHaveAttribute('aria-current');
  });

  it('updates active highlight when route changes', () => {
    const { rerender } = render(<Navbar />);
    mockUsePathname.mockReturnValue('/milestones');

    rerender(<Navbar />);

    expect(screen.getByRole('link', { name: 'Milestones' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Contracts' })).not.toHaveAttribute('aria-current');
  });

  it('maintains logical focus order (keyboard tab navigation)', () => {
    render(<Navbar />);

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const links = screen.getAllByRole('link');

    // All links must be focusable and inside the nav landmark
    links.forEach((link) => {
      expect(nav).toContainElement(link);
      expect(link).not.toHaveAttribute('tabindex'); // Link elements are naturally focusable
    });

    // Verify natural tab order matches DOM order
    expect(links[0]).toHaveTextContent('Contracts');
    expect(links[1]).toHaveTextContent('Milestones');
    expect(links[2]).toHaveTextContent('Reputation');
  });

  it('applies visible focus rings to all interactive elements', () => {
    render(<Navbar />);

    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link.className).toMatch(/focus:ring-2/);
      expect(link.className).toMatch(/focus:outline-none/);
    });
  });

  it('renders without horizontal overflow on 320px viewport (mobile)', () => {
    // Simulate mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320,
    });

    render(<Navbar />);

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const list = nav.querySelector('ul');

    expect(list?.className).toMatch(/flex-wrap/);
  });

  it('passes jest-axe accessibility audit', async () => {
    const { container } = render(<Navbar />);
    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// Keyboard operation
// ---------------------------------------------------------------------------

describe('Navbar — keyboard operation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('each link receives focus when tabbed to', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    // Tab into the nav: the first link should receive focus.
    await user.tab();
    expect(screen.getByRole('link', { name: 'Contracts' })).toHaveFocus();

    // Second tab moves to Milestones.
    await user.tab();
    expect(screen.getByRole('link', { name: 'Milestones' })).toHaveFocus();

    // Third tab moves to Reputation.
    await user.tab();
    expect(screen.getByRole('link', { name: 'Reputation' })).toHaveFocus();
  });

  it('Shift+Tab reverses focus order through the links', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    // Move focus forward to the last link first.
    const reputationLink = screen.getByRole('link', { name: 'Reputation' });
    reputationLink.focus();
    expect(reputationLink).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('link', { name: 'Milestones' })).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByRole('link', { name: 'Contracts' })).toHaveFocus();
  });

  it('Enter key activates a focused link (native browser behaviour is preserved)', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    // Links delegate navigation to the browser; verify the element is
    // focusable and survives an Enter keypress without throwing.
    const contractsLink = screen.getByRole('link', { name: 'Contracts' });
    contractsLink.focus();
    expect(contractsLink).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(contractsLink).toBeInTheDocument();
  });

  it('focus ring utility classes are present on every link (visible indicator)', () => {
    render(<Navbar />);

    screen.getAllByRole('link').forEach((link) => {
      expect(link.className).toContain('focus:ring-2');
      expect(link.className).toContain('focus:outline-none');
      expect(link.className).toContain('focus:ring-[var(--ring)]');
    });
  });

  it('no link has a negative tabindex that would exclude it from the tab sequence', () => {
    render(<Navbar />);

    screen.getAllByRole('link').forEach((link) => {
      // tabIndex defaults to 0 for anchor elements; -1 would remove from sequence.
      expect(link).not.toHaveAttribute('tabindex', '-1');
    });
  });
});
