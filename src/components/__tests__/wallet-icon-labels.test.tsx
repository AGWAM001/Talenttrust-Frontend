import React from 'react';
import { render, screen } from '@testing-library/react';
import { WalletConnectButton } from '../WalletConnectButton';
import { WalletBulkToolbar } from '../wallet/WalletBulkToolbar';
import { WalletItemList } from '../wallet/WalletItemList';
import type { WalletItem } from '@/types/domain';
import { PreferencesProvider } from '@/lib/preferences';

jest.mock('@/contexts/WalletContext', () => ({
  useWallet: jest.fn(),
}));

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
    addToast: jest.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/hooks/useWalletFocus', () => ({
  useWalletFocus: () => ({
    connectButtonRef: { current: null },
    connectedElementRef: { current: null },
  }),
}));

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
];

const useWallet = require('@/contexts/WalletContext').useWallet as jest.MockedFunction<any>;

function createWalletState(overrides: Record<string, unknown> = {}) {
  return {
    address: null,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  };
}

describe('wallet icon-only button accessible names', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('WalletConnectButton — icon-only controls', () => {
    it('exposes aria-label on the connect button', () => {
      useWallet.mockReturnValue(createWalletState());
      render(<WalletConnectButton />);
      expect(screen.getByRole('button', { name: 'Connect wallet' })).toHaveAttribute('aria-label', 'Connect wallet');
    });

    it('exposes aria-labels on all three icon buttons when connected', () => {
      useWallet.mockReturnValue(createWalletState({ address: 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H' }));
      render(
        <PreferencesProvider>
          <WalletConnectButton />
        </PreferencesProvider>,
      );

      expect(screen.getByRole('button', { name: 'Switch to compact view' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Copy address to clipboard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Disconnect wallet' })).toBeInTheDocument();
    });

    it('exposes aria-label on the retry button in error state', () => {
      useWallet.mockReturnValue(createWalletState({ error: 'Connection failed' }));
      render(<WalletConnectButton />);
      expect(screen.getByRole('button', { name: 'Retry wallet connection' })).toHaveAttribute('aria-label', 'Retry wallet connection');
    });
  });

  describe('WalletBulkToolbar — icon-less labeled buttons', () => {
    it('exposes aria-labels on all action buttons', () => {
      render(
        <WalletBulkToolbar
          selectedCount={2}
          onClearSelection={jest.fn()}
          onExport={jest.fn()}
          onDelete={jest.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: 'Clear item selection' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export 2 selected items/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete 2 selected items/i })).toBeInTheDocument();
    });

    it('uses singular aria-labels when one item is selected', () => {
      render(
        <WalletBulkToolbar
          selectedCount={1}
          onClearSelection={jest.fn()}
          onExport={jest.fn()}
          onDelete={jest.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /export 1 selected item/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete 1 selected item/i })).toBeInTheDocument();
    });

    it('uses toolbar role and accessible name', () => {
      render(
        <WalletBulkToolbar
          selectedCount={1}
          onClearSelection={jest.fn()}
          onExport={jest.fn()}
          onDelete={jest.fn()}
        />,
      );

      expect(screen.getByRole('toolbar', { name: 'Bulk actions toolbar' })).toBeInTheDocument();
    });
  });

  describe('WalletItemList — icon-only delete buttons', () => {
    it('exposes aria-label on every row delete button', () => {
      render(
        <WalletItemList
          items={SAMPLE_ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
          onDeleteItem={jest.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete USD Coin (USDC)' })).toBeInTheDocument();
    });

    it('does not render delete buttons when onDeleteItem is omitted', () => {
      render(
        <WalletItemList
          items={SAMPLE_ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />,
      );

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('uses aria-label on select-all checkbox', () => {
      render(
        <WalletItemList
          items={SAMPLE_ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />,
      );

      expect(screen.getByRole('checkbox', { name: /select all wallet items/i })).toBeInTheDocument();
    });

    it('uses aria-label on per-item checkboxes', () => {
      render(
        <WalletItemList
          items={SAMPLE_ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />,
      );

      expect(screen.getByRole('checkbox', { name: /select stellar lumens \(xlm\)/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /select usd coin \(usdc\)/i })).toBeInTheDocument();
    });

    it('table has accessible name', () => {
      const { container } = render(
        <WalletItemList
          items={SAMPLE_ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />,
      );

      expect(container.querySelector('table[aria-label="Wallet items table"]')).toBeInTheDocument();
    });
  });
});
