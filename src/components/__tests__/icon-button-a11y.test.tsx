import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    addToast: jest.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/contexts/WalletContext', () => ({
  useWallet: () => ({
    address: null,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

beforeEach(() => {
  localStorage.clear();
});

describe('a11y: icon button semantics', () => {
  it('ContractRow copy button has no axe violations', async () => {
    const { ContractRow } = require('@/components/contracts/ContractRow');
    const contract = {
      id: '0xABCDEF1234567890',
      contractName: 'Test Contract',
      status: 'Active',
      createdAt: 'Jan 1, 2026',
    };
    const { container } = render(
      <ul><ContractRow contract={contract} /></ul>,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('WalletConnectButton unconnected state has no axe violations', async () => {
    const { WalletConnectButton } = require('@/components/WalletConnectButton');
    const { container } = render(<WalletConnectButton />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
