import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useWalletFocus } from '../useWalletFocus';

interface TestHarnessProps {
  address: string | null;
  isConnecting: boolean;
}

function TestHarness({ address, isConnecting }: TestHarnessProps) {
  const { connectButtonRef, connectedElementRef } = useWalletFocus(address, isConnecting);
  return (
    <div>
      <button ref={connectButtonRef} data-testid="connect-button">
        Connect Wallet
      </button>
      <div ref={connectedElementRef} data-testid="connected-element" tabIndex={-1}>
        Wallet connected
      </div>
    </div>
  );
}

describe('useWalletFocus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('moves focus to connectedElementRef after address becomes non-null', () => {
    const { rerender } = render(<TestHarness address={null} isConnecting={false} />);

    expect(document.activeElement).not.toBe(
      screen.getByTestId('connected-element'),
    );

    rerender(<TestHarness address="GABC123" isConnecting={false} />);

    act(() => {
      jest.runAllTimers();
    });

    expect(document.activeElement).toBe(screen.getByTestId('connected-element'));
  });

  it('moves focus to connectButtonRef after address becomes null', () => {
    const { rerender } = render(<TestHarness address="GABC123" isConnecting={false} />);

    act(() => {
      jest.runAllTimers();
    });

    rerender(<TestHarness address={null} isConnecting={false} />);

    expect(document.activeElement).toBe(screen.getByTestId('connect-button'));
  });

  it('does not move focus during isConnecting state', () => {
    const { rerender } = render(<TestHarness address={null} isConnecting={false} />);

    const connectButton = screen.getByTestId('connect-button');
    connectButton.focus();
    const focusedBefore = document.activeElement;

    rerender(<TestHarness address={null} isConnecting={true} />);

    act(() => {
      jest.runAllTimers();
    });

    expect(document.activeElement).toBe(focusedBefore);
    expect(document.activeElement).not.toBe(screen.getByTestId('connected-element'));
  });

  it('does not move focus when address changes from one non-null value to another', () => {
    const { rerender } = render(<TestHarness address="GABC123" isConnecting={false} />);

    act(() => {
      jest.runAllTimers();
    });

    const connectedElement = screen.getByTestId('connected-element');
    connectedElement.focus();

    rerender(<TestHarness address="GXYZ789" isConnecting={false} />);

    act(() => {
      jest.runAllTimers();
    });

    // Focus should stay on connected element (no transition from null)
    expect(document.activeElement).toBe(connectedElement);
  });

  it('handles rapid connect then disconnect cycles', () => {
    const { rerender } = render(<TestHarness address={null} isConnecting={false} />);

    // Connect
    rerender(<TestHarness address="GABC123" isConnecting={false} />);
    act(() => {
      jest.runAllTimers();
    });
    expect(document.activeElement).toBe(screen.getByTestId('connected-element'));

    // Disconnect
    rerender(<TestHarness address={null} isConnecting={false} />);
    expect(document.activeElement).toBe(screen.getByTestId('connect-button'));

    // Reconnect
    rerender(<TestHarness address="GABC123" isConnecting={false} />);
    act(() => {
      jest.runAllTimers();
    });
    expect(document.activeElement).toBe(screen.getByTestId('connected-element'));
  });
});
