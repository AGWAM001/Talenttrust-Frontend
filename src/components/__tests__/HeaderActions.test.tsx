/**
 * @file HeaderActions.test.tsx
 *
 * Comprehensive test suite for the HeaderActions disclosure component.
 *
 * Coverage targets:
 *  1. aria-expanded flips between "false" and "true" on each toggle click.
 *  2. aria-controls on the toggle button matches the id of the controlled panel.
 *  3. Visually hidden (sr-only) label swaps between "Open wallet actions" and
 *     "Close wallet actions" as the disclosure opens and closes.
 *  4. Both ThemeToggle and WalletConnectButton mount on initial render.
 *  5. jest-axe accessibility check passes on the expanded (open) state.
 *  6. Edge cases: keyboard activation, repeated toggles, clean unmount.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import HeaderActions from '../HeaderActions';

expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockShouldThrowWalletButton = false;

jest.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <button type="button" data-testid="theme-toggle">Theme</button>,
}));

jest.mock('@/components/WalletConnectButton', () => ({
  WalletConnectButton: () => {
    if (mockShouldThrowWalletButton) {
      throw new Error('Wallet section exploded');
    }

    return (
      <button type="button" data-testid="wallet-connect-button">
        Connect Wallet
      </button>
    );
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PANEL_ID = 'header-wallet-actions';

/** Returns the disclosure toggle button by its initial sr-only label. */
const getToggle = () =>
  screen.getByRole('button', { name: /open wallet actions/i });

/** Returns the wallet actions panel by its accessible region label. */
const getPanel = () =>
  screen.getByRole('region', { name: /wallet actions/i });

// ---------------------------------------------------------------------------
// Suite 1 — Initial render
// ---------------------------------------------------------------------------

describe('HeaderActions — initial render', () => {
  beforeEach(() => {
    mockShouldThrowWalletButton = false;
  });

  it('renders the disclosure toggle button in the collapsed state', () => {
    render(<HeaderActions />);
    const toggle = getToggle();
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the controlled wallet-actions panel', () => {
    render(<HeaderActions />);
    expect(getPanel()).toBeInTheDocument();
  });

  it('renders ThemeToggle on mount', () => {
    render(<HeaderActions />);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('renders WalletConnectButton on mount', () => {
    render(<HeaderActions />);
    expect(screen.getByTestId('wallet-connect-button')).toBeInTheDocument();
  });

  it('renders an accessible fallback and retry when the wallet section throws', () => {
    mockShouldThrowWalletButton = true;

    const { rerender } = render(<HeaderActions />);

    expect(screen.getByRole('alert')).toHaveTextContent('Wallet section failed to load.');
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

    mockShouldThrowWalletButton = false;
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    rerender(<HeaderActions />);

    expect(screen.getByTestId('wallet-connect-button')).toBeInTheDocument();
  });

  it('panel starts in the hidden state (carries "hidden" class)', () => {
    render(<HeaderActions />);
    expect(getPanel()).toHaveClass('hidden');
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — aria-controls / aria-expanded wiring
// ---------------------------------------------------------------------------

describe('HeaderActions — ARIA attribute wiring', () => {
  it('aria-controls on the toggle equals the panel element id', () => {
    render(<HeaderActions />);
    const toggle = getToggle();
    const panel = getPanel();

    expect(toggle).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('id', PANEL_ID);
  });

  it('panel id is "header-wallet-actions"', () => {
    render(<HeaderActions />);
    expect(getPanel().id).toBe(PANEL_ID);
  });

  it('aria-expanded starts as "false"', () => {
    render(<HeaderActions />);
    expect(getToggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('aria-expanded becomes "true" after the first click', () => {
    render(<HeaderActions />);
    fireEvent.click(getToggle());
    // After opening, find toggle by updated label
    const toggle = screen.getByRole('button', { name: /close wallet actions/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('aria-expanded returns to "false" after the second click', () => {
    render(<HeaderActions />);
    fireEvent.click(getToggle());
    // Now toggle is "Close wallet actions"
    const toggle = screen.getByRole('button', { name: /close wallet actions/i });
    fireEvent.click(toggle);
    // Back to "Open wallet actions"
    expect(screen.getByRole('button', { name: /open wallet actions/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('aria-controls always points to the same stable panel id across toggles', () => {
    render(<HeaderActions />);
    // Open
    fireEvent.click(getToggle());
    const openToggle = screen.getByRole('button', { name: /close wallet actions/i });
    expect(openToggle).toHaveAttribute('aria-controls', PANEL_ID);

    // Close
    fireEvent.click(openToggle);
    const closedToggle = screen.getByRole('button', { name: /open wallet actions/i });
    expect(closedToggle).toHaveAttribute('aria-controls', PANEL_ID);
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — SR-only label swap
// ---------------------------------------------------------------------------

describe('HeaderActions — screen-reader label swap', () => {
  it('sr-only label is "Open wallet actions" when collapsed', () => {
    render(<HeaderActions />);
    // Accessible name comes from the sr-only span inside the button.
    expect(
      screen.getByRole('button', { name: 'Open wallet actions' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Close wallet actions' }),
    ).not.toBeInTheDocument();
  });

  it('sr-only label swaps to "Close wallet actions" when expanded', () => {
    render(<HeaderActions />);
    fireEvent.click(screen.getByRole('button', { name: 'Open wallet actions' }));

    expect(
      screen.getByRole('button', { name: 'Close wallet actions' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open wallet actions' }),
    ).not.toBeInTheDocument();
  });

  it('sr-only label swaps back to "Open wallet actions" when collapsed again', () => {
    render(<HeaderActions />);
    // Open
    fireEvent.click(screen.getByRole('button', { name: 'Open wallet actions' }));
    // Close
    fireEvent.click(screen.getByRole('button', { name: 'Close wallet actions' }));

    expect(
      screen.getByRole('button', { name: 'Open wallet actions' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Close wallet actions' }),
    ).not.toBeInTheDocument();
  });

  it('label and aria-expanded are always in sync', () => {
    render(<HeaderActions />);

    // Collapsed state
    const collapsed = screen.getByRole('button', { name: 'Open wallet actions' });
    expect(collapsed).toHaveAttribute('aria-expanded', 'false');

    // Open
    fireEvent.click(collapsed);
    const expanded = screen.getByRole('button', { name: 'Close wallet actions' });
    expect(expanded).toHaveAttribute('aria-expanded', 'true');

    // Close
    fireEvent.click(expanded);
    const collapsedAgain = screen.getByRole('button', { name: 'Open wallet actions' });
    expect(collapsedAgain).toHaveAttribute('aria-expanded', 'false');
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Panel visibility
// ---------------------------------------------------------------------------

describe('HeaderActions — panel visibility', () => {
  it('panel has "hidden" class when collapsed', () => {
    render(<HeaderActions />);
    expect(getPanel()).toHaveClass('hidden');
    expect(getPanel()).not.toHaveClass('block');
  });

  it('panel does not have "hidden" class when expanded', () => {
    render(<HeaderActions />);
    fireEvent.click(getToggle());
    expect(getPanel()).not.toHaveClass('hidden');
    expect(getPanel()).toHaveClass('block');
  });

  it('panel visibility toggles correctly across multiple clicks', () => {
    render(<HeaderActions />);
    const toggle = getToggle();
    const panel = getPanel();

    // Start: hidden
    expect(panel).toHaveClass('hidden');

    // Open
    fireEvent.click(toggle);
    expect(panel).not.toHaveClass('hidden');

    // Close (use updated label)
    fireEvent.click(screen.getByRole('button', { name: /close wallet actions/i }));
    expect(panel).toHaveClass('hidden');

    // Open again
    fireEvent.click(screen.getByRole('button', { name: /open wallet actions/i }));
    expect(panel).not.toHaveClass('hidden');
  });

  it('WalletConnectButton is always in the DOM regardless of panel state', () => {
    render(<HeaderActions />);

    // Collapsed
    expect(screen.getByTestId('wallet-connect-button')).toBeInTheDocument();

    // Expanded
    fireEvent.click(getToggle());
    expect(screen.getByTestId('wallet-connect-button')).toBeInTheDocument();

    // Collapsed again
    fireEvent.click(screen.getByRole('button', { name: /close wallet actions/i }));
    expect(screen.getByTestId('wallet-connect-button')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — Keyboard activation
// ---------------------------------------------------------------------------

describe('HeaderActions — keyboard activation', () => {
  it('Enter key opens the disclosure', async () => {
    const user = userEvent.setup();
    render(<HeaderActions />);
    const toggle = getToggle();

    toggle.focus();
    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('button', { name: /close wallet actions/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(getPanel()).not.toHaveClass('hidden');
  });

  it('Space key opens the disclosure', async () => {
    const user = userEvent.setup();
    render(<HeaderActions />);
    const toggle = getToggle();

    toggle.focus();
    await user.keyboard('[Space]');

    expect(
      screen.getByRole('button', { name: /close wallet actions/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(getPanel()).not.toHaveClass('hidden');
  });

  it('Enter key then Space key toggles open then closed', async () => {
    const user = userEvent.setup();
    render(<HeaderActions />);
    const toggle = getToggle();

    toggle.focus();
    await user.keyboard('{Enter}');

    // Now focused element is the same button (re-rendered with new label)
    const openToggle = screen.getByRole('button', { name: /close wallet actions/i });
    openToggle.focus();
    await user.keyboard('[Space]');

    expect(
      screen.getByRole('button', { name: /open wallet actions/i }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(getPanel()).toHaveClass('hidden');
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — Repeated toggle cycles (edge cases)
// ---------------------------------------------------------------------------

describe('HeaderActions — repeated toggle cycles', () => {
  it('handles 10 rapid toggles without state corruption', () => {
    render(<HeaderActions />);

    for (let i = 0; i < 10; i++) {
      const isOpen = i % 2 !== 0; // after i clicks: open when i is odd
      if (!isOpen) {
        fireEvent.click(screen.getByRole('button', { name: /open wallet actions/i }));
      } else {
        fireEvent.click(screen.getByRole('button', { name: /close wallet actions/i }));
      }
    }

    // After 10 clicks the state is: even → collapsed (0-indexed last toggle is click 10 which would be open)
    // 10 clicks: 0→open,1→close,2→open,3→close,4→open,5→close,6→open,7→close,8→open,9→close → collapsed
    expect(screen.getByRole('button', { name: /open wallet actions/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(getPanel()).toHaveClass('hidden');
  });

  it('aria-controls never changes its value during repeated cycles', () => {
    render(<HeaderActions />);

    for (let i = 0; i < 6; i++) {
      const label = i % 2 === 0 ? /open wallet actions/i : /close wallet actions/i;
      const btn = screen.getByRole('button', { name: label });
      expect(btn).toHaveAttribute('aria-controls', PANEL_ID);
      fireEvent.click(btn);
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — jest-axe accessibility (collapsed and expanded states)
// ---------------------------------------------------------------------------

describe('HeaderActions — accessibility (jest-axe)', () => {
  it('has no axe violations in the collapsed (initial) state', async () => {
    const { container } = render(<HeaderActions />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in the expanded (open) state', async () => {
    const { container } = render(<HeaderActions />);

    fireEvent.click(screen.getByRole('button', { name: /open wallet actions/i }));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations after toggling closed again', async () => {
    const { container } = render(<HeaderActions />);

    // Open
    fireEvent.click(screen.getByRole('button', { name: /open wallet actions/i }));
    // Close
    fireEvent.click(screen.getByRole('button', { name: /close wallet actions/i }));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------
// Suite 8 — Unmount / cleanup
// ---------------------------------------------------------------------------

describe('HeaderActions — unmount', () => {
  it('unmounts cleanly without throwing', () => {
    const { unmount } = render(<HeaderActions />);
    expect(() => unmount()).not.toThrow();
  });

  it('unmounts while open without throwing', () => {
    const { unmount } = render(<HeaderActions />);
    fireEvent.click(getToggle());
    expect(() => unmount()).not.toThrow();
  });
});
