'use strict';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { testA11y, renderWithA11y, assertNoA11yViolations } from '@/test-utils/a11y';
import { WalletItemList } from '@/components/wallet/WalletItemList';
import { WalletBulkToolbar } from '@/components/wallet/WalletBulkToolbar';
import type { WalletItem } from '@/types/domain';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const SAMPLE_ITEMS: WalletItem[] = [
  {
    id: 'w-1',
    name: 'Stellar Lumens (XLM)',
    type: 'Native Asset',
    balance: 12500,
    currency: 'XLM',
    address: 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H',
    status: 'Active',
    createdAt: '2026-01-15',
  },
  {
    id: 'w-2',
    name: 'USD Coin (USDC)',
    type: 'Stablecoin',
    balance: 3200,
    currency: 'USDC',
    address: 'GA2C456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
    status: 'Pending',
    createdAt: '2026-02-01',
  },
  {
    id: 'w-3',
    name: 'Archived Client Token',
    type: 'Custom Asset',
    balance: 50,
    currency: 'ACT',
    status: 'Archived',
    createdAt: '2025-11-20',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Replaces window.matchMedia with an implementation that answers `true`
 * only for `(prefers-reduced-motion: reduce)`. Returns a restore callback.
 */
function mockReducedMotion(): () => void {
  const original = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: original,
    });
  };
}

// ---------------------------------------------------------------------------
// prefers-reduced-motion — WalletItemList
// ---------------------------------------------------------------------------

describe('a11y: prefers-reduced-motion — WalletItemList', () => {
  let restoreMatchMedia: () => void;

  beforeEach(() => {
    restoreMatchMedia = mockReducedMotion();
  });

  afterEach(() => {
    restoreMatchMedia();
  });

  it('matchMedia returns true for the reduced-motion query', () => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(false);
  });

  it('renders all wallet items under reduced motion without removing elements', () => {
    render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    expect(screen.getByText('Stellar Lumens (XLM)')).toBeInTheDocument();
    expect(screen.getByText('USD Coin (USDC)')).toBeInTheDocument();
    expect(screen.getByText('Archived Client Token')).toBeInTheDocument();
  });

  it('row transition-colors class is preserved (CSS collapses duration to 0.01ms)', () => {
    render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const row = screen.getByTestId('wallet-item-row-w-1');
    // The transition-colors class must remain — the @media rule in globals.css
    // collapses the duration, but stripping the class breaks hover/focus styles.
    expect(row.className).toContain('transition-colors');
  });

  it('status badges remain visible under reduced motion', () => {
    render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('checkboxes remain functional under reduced motion', () => {
    const onToggleSelect = jest.fn();
    render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set()}
        onToggleSelect={onToggleSelect}
        onToggleSelectAll={jest.fn()}
      />
    );

    const checkbox = screen.getByTestId('select-item-checkbox-w-1');
    fireEvent.click(checkbox);
    expect(onToggleSelect).toHaveBeenCalledWith('w-1');
  });

  it('selected row still applies selection styling under reduced motion', () => {
    render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set(['w-1'])}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const row = screen.getByTestId('wallet-item-row-w-1');
    expect(row.className).toContain('bg-blue-50/40');
  });

  it('delete button transition class is preserved under reduced motion', () => {
    render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
        onDeleteItem={jest.fn()}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' });
    expect(deleteBtn.className).toContain('transition');
  });

  it('has no axe violations under reduced motion', async () => {
    await testA11y(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set(['w-1'])}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
        onDeleteItem={jest.fn()}
      />
    );
  });

  it('has no axe violations with empty items under reduced motion', async () => {
    const { container } = render(
      <WalletItemList
        items={[]}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );
    // Empty list returns null, so no violations possible
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// prefers-reduced-motion — WalletBulkToolbar
// ---------------------------------------------------------------------------

describe('a11y: prefers-reduced-motion — WalletBulkToolbar', () => {
  let restoreMatchMedia: () => void;

  beforeEach(() => {
    restoreMatchMedia = mockReducedMotion();
  });

  afterEach(() => {
    restoreMatchMedia();
  });

  it('toolbar renders with transition-all class preserved under reduced motion', () => {
    render(
      <WalletBulkToolbar
        selectedCount={2}
        onClearSelection={jest.fn()}
        onExport={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    const toolbar = screen.getByTestId('wallet-bulk-toolbar');
    // transition-all class must remain — CSS handles the duration collapse
    expect(toolbar.className).toContain('transition-all');
  });

  it('Export button transition class is preserved under reduced motion', () => {
    render(
      <WalletBulkToolbar
        selectedCount={2}
        onClearSelection={jest.fn()}
        onExport={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    const exportBtn = screen.getByRole('button', { name: /export 2 selected items/i });
    expect(exportBtn.className).toContain('transition');
  });

  it('Delete button transition class is preserved under reduced motion', () => {
    render(
      <WalletBulkToolbar
        selectedCount={2}
        onClearSelection={jest.fn()}
        onExport={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
    expect(deleteBtn.className).toContain('transition');
  });

  it('action buttons remain functional under reduced motion', () => {
    const onExport = jest.fn();
    const onDelete = jest.fn();
    const onClear = jest.fn();

    render(
      <WalletBulkToolbar
        selectedCount={3}
        onClearSelection={onClear}
        onExport={onExport}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /export 3 selected items/i }));
    expect(onExport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /delete 3 selected items/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /clear item selection/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('Escape key still clears selection under reduced motion', () => {
    const onClear = jest.fn();
    render(
      <WalletBulkToolbar
        selectedCount={1}
        onClearSelection={onClear}
        onExport={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations under reduced motion', async () => {
    await testA11y(
      <WalletBulkToolbar
        selectedCount={2}
        onClearSelection={jest.fn()}
        onExport={jest.fn()}
        onDelete={jest.fn()}
      />
    );
  });

  it('renders nothing when selectedCount is 0 under reduced motion', () => {
    const { container } = render(
      <WalletBulkToolbar
        selectedCount={0}
        onClearSelection={jest.fn()}
        onExport={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// High-contrast / forced-colors — WalletItemList
// ---------------------------------------------------------------------------

describe('a11y: high-contrast — WalletItemList', () => {
  it('table container has data-wallet-table attribute for forced-colors targeting', () => {
    const { container } = render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const tableContainer = container.querySelector('[data-wallet-table]');
    expect(tableContainer).toBeInTheDocument();
  });

  it('selected rows have data-selected attribute for forced-colors highlighting', () => {
    render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set(['w-1'])}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const selectedRow = screen.getByTestId('wallet-item-row-w-1');
    expect(selectedRow).toHaveAttribute('data-selected', 'true');

    const unselectedRow = screen.getByTestId('wallet-item-row-w-2');
    expect(unselectedRow).not.toHaveAttribute('data-selected');
  });

  it('status badges have data-wallet-status attribute for forced-colors styling', () => {
    const { container } = render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const activeBadge = container.querySelector('[data-wallet-status="Active"]');
    expect(activeBadge).toBeInTheDocument();
    expect(activeBadge).toHaveTextContent('Active');

    const pendingBadge = container.querySelector('[data-wallet-status="Pending"]');
    expect(pendingBadge).toBeInTheDocument();
    expect(pendingBadge).toHaveTextContent('Pending');

    const archivedBadge = container.querySelector('[data-wallet-status="Archived"]');
    expect(archivedBadge).toBeInTheDocument();
    expect(archivedBadge).toHaveTextContent('Archived');
  });

  it('all status types render distinct status badges', () => {
    const { container } = render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const badges = container.querySelectorAll('[data-wallet-status]');
    expect(badges).toHaveLength(3);

    const statuses = Array.from(badges).map((b) => b.getAttribute('data-wallet-status'));
    expect(statuses).toContain('Active');
    expect(statuses).toContain('Pending');
    expect(statuses).toContain('Archived');
  });

  it('checkboxes are standard input[type="checkbox"] for forced-color-adjust: auto', () => {
    const { container } = render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const tableContainer = container.querySelector('[data-wallet-table]');
    const checkboxes = tableContainer!.querySelectorAll('input[type="checkbox"]');
    // 1 select-all + 3 item checkboxes = 4 total
    expect(checkboxes).toHaveLength(4);
  });

  it('delete buttons have accessible labels for screen readers in high-contrast', () => {
    render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
        onDeleteItem={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete USD Coin (USDC)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Archived Client Token' })).toBeInTheDocument();
  });

  it('has no axe violations (structural a11y for high-contrast rendering)', async () => {
    await testA11y(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set(['w-2'])}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
        onDeleteItem={jest.fn()}
      />
    );
  });
});

// ---------------------------------------------------------------------------
// High-contrast / forced-colors — WalletBulkToolbar
// ---------------------------------------------------------------------------

describe('a11y: high-contrast — WalletBulkToolbar', () => {
  it('toolbar has data-wallet-toolbar attribute for forced-colors targeting', () => {
    const { container } = render(
      <WalletBulkToolbar
        selectedCount={2}
        onClearSelection={jest.fn()}
        onExport={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    const toolbar = container.querySelector('[data-wallet-toolbar]');
    expect(toolbar).toBeInTheDocument();
  });

  it('toolbar has visible role="toolbar" for assistive technology in high-contrast', () => {
    render(
      <WalletBulkToolbar
        selectedCount={2}
        onClearSelection={jest.fn()}
        onExport={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Bulk actions toolbar' });
    expect(toolbar).toBeInTheDocument();
  });

  it('action buttons have descriptive aria-labels for screen readers', () => {
    render(
      <WalletBulkToolbar
        selectedCount={1}
        onClearSelection={jest.fn()}
        onExport={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /export 1 selected item/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete 1 selected item/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear item selection/i })).toBeInTheDocument();
  });

  it('has no axe violations (structural a11y for high-contrast rendering)', async () => {
    await testA11y(
      <WalletBulkToolbar
        selectedCount={3}
        onClearSelection={jest.fn()}
        onExport={jest.fn()}
        onDelete={jest.fn()}
      />
    );
  });
});

// ---------------------------------------------------------------------------
// Combined: reduced-motion + high-contrast edge cases
// ---------------------------------------------------------------------------

describe('a11y: reduced-motion + high-contrast combined — wallet', () => {
  let restoreMatchMedia: () => void;

  beforeEach(() => {
    restoreMatchMedia = mockReducedMotion();
  });

  afterEach(() => {
    restoreMatchMedia();
  });

  it('data-selected toggles correctly when selection changes under reduced motion', () => {
    const { rerender } = render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    // No rows selected initially
    const row = screen.getByTestId('wallet-item-row-w-1');
    expect(row).not.toHaveAttribute('data-selected');

    // Select row
    rerender(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set(['w-1'])}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );
    expect(row).toHaveAttribute('data-selected', 'true');

    // Deselect row
    rerender(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );
    expect(row).not.toHaveAttribute('data-selected');
  });

  it('select-all checkbox indeterminate state works under reduced motion', () => {
    render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set(['w-1'])}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const selectAll = screen.getByTestId('select-all-checkbox') as HTMLInputElement;
    // Partial selection: indeterminate should be true
    expect(selectAll.indeterminate).toBe(true);
    expect(selectAll.checked).toBe(false);
  });

  it('select-all checkbox fully checked when all items are selected under reduced motion', () => {
    render(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set(['w-1', 'w-2', 'w-3'])}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const selectAll = screen.getByTestId('select-all-checkbox') as HTMLInputElement;
    expect(selectAll.checked).toBe(true);
    expect(selectAll.indeterminate).toBe(false);
  });

  it('WalletItemList with all items selected has no axe violations under reduced motion', async () => {
    await testA11y(
      <WalletItemList
        items={SAMPLE_ITEMS}
        selectedIds={new Set(['w-1', 'w-2', 'w-3'])}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
        onDeleteItem={jest.fn()}
      />
    );
  });

  it('toolbar and list together have no axe violations under reduced motion', async () => {
    const view = renderWithA11y(
      <div>
        <WalletBulkToolbar
          selectedCount={2}
          onClearSelection={jest.fn()}
          onExport={jest.fn()}
          onDelete={jest.fn()}
        />
        <WalletItemList
          items={SAMPLE_ITEMS}
          selectedIds={new Set(['w-1', 'w-2'])}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
          onDeleteItem={jest.fn()}
        />
      </div>
    );

    await assertNoA11yViolations(view.container);
  });
});
