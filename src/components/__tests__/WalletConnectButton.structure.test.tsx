import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WalletConnectButton } from '../WalletConnectButton';
import { useWallet } from '@/contexts/WalletContext';
import { testA11y } from '@/test-utils/a11y';

jest.mock('@/contexts/WalletContext', () => ({
  useWallet: jest.fn(),
}));

const mockShowError = jest.fn();
jest.mock('@/components/toast/toast-provider', () => ({
  useToast: jest.fn(() => ({ showError: mockShowError })),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

const originalClipboard = navigator.clipboard;

function createWalletState(overrides: { address: string | null; isConnecting: boolean; error: string | null; connect: jest.Mock; disconnect: jest.Mock }) {
  return {
    address: null,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  };
}

describe('WalletConnectButton structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
  });

  it('renders an empty/disconnected state with only the connect control', () => {
    const connect = jest.fn();
    mockUseWallet.mockReturnValue(createWalletState({ address: null, isConnecting: false, error: null, connect, disconnect: jest.fn() }));

    const { container } = render(<WalletConnectButton />);

    const button = screen.getByRole('button', { name: 'Connect wallet' });
    expect(button).toHaveTextContent('Connect Wallet');
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute('aria-label', 'Connect wallet');

    expect(screen.queryByText(/connection error/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy address/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /disconnect/i })).not.toBeInTheDocument();

    const outerDiv = container.firstElementChild;
    expect(outerDiv).toHaveClass('rounded-xl');
    expect(outerDiv).toHaveClass('bg-blue-600');
    expect(outerDiv).toHaveAttribute('aria-label', 'Connect wallet');
  });

  it('renders a loaded/connected state with the truncated address, copy, and disconnect controls', () => {
    const address = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
    mockUseWallet.mockReturnValue(createWalletState({ address, isConnecting: false, error: null, connect: jest.fn(), disconnect: jest.fn() }));

    const { container } = render(<WalletConnectButton />);

    expect(screen.getByText('GBRPYH...OX2H')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy address to clipboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect wallet' })).toBeInTheDocument();

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('rounded-xl');
    expect(wrapper).toHaveClass('bg-slate-100');
    expect(wrapper).toHaveClass('ring-1');
  });

  it('renders an error state with the retry action', () => {
    const connect = jest.fn();
    mockUseWallet.mockReturnValue(createWalletState({ address: null, isConnecting: false, error: 'Connection failed', connect, disconnect: jest.fn() }));

    const { container } = render(<WalletConnectButton />);

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Retry wallet connection' });
    expect(retryButton).toHaveTextContent('Retry');

    expect(screen.queryByRole('button', { name: /connect wallet/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /disconnect/i })).not.toBeInTheDocument();

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('bg-red-50');
    expect(wrapper).toHaveClass('text-red-600');
    expect(wrapper).toHaveClass('ring-1');
    expect(wrapper).toHaveClass('ring-red-200');
  });

  it('renders a connecting/loading state with a disabled control and spinner', () => {
    mockUseWallet.mockReturnValue(createWalletState({ address: null, isConnecting: true, error: null, connect: jest.fn(), disconnect: jest.fn() }));

    const { container } = render(<WalletConnectButton />);

    const button = screen.getByRole('button', { name: 'Connect wallet' });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Connecting...');
    expect(button.querySelector('svg.animate-spin')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /copy address/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /disconnect/i })).not.toBeInTheDocument();

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('bg-blue-600');
    expect(wrapper).toHaveClass('disabled:cursor-not-allowed');
    expect(wrapper).toHaveClass('disabled:opacity-70');
  });

  it('passes accessibility audits in the disconnected state', async () => {
    mockUseWallet.mockReturnValue(createWalletState({ address: null, isConnecting: false, error: null, connect: jest.fn(), disconnect: jest.fn() }));

    await testA11y(<WalletConnectButton />);
  });

  it('passes accessibility audits in the connected state', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });

    mockUseWallet.mockReturnValue(createWalletState({ address: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H', isConnecting: false, error: null, connect: jest.fn(), disconnect: jest.fn() }));

    await testA11y(<WalletConnectButton />);
  });

  it('passes accessibility audits in the error state', async () => {
    mockUseWallet.mockReturnValue(createWalletState({ address: null, isConnecting: false, error: 'Connection failed', connect: jest.fn(), disconnect: jest.fn() }));

    await testA11y(<WalletConnectButton />);
  });

  it('passes accessibility audits in the connecting state', async () => {
    mockUseWallet.mockReturnValue(createWalletState({ address: null, isConnecting: true, error: null, connect: jest.fn(), disconnect: jest.fn() }));

    await testA11y(<WalletConnectButton />);
  });
});
