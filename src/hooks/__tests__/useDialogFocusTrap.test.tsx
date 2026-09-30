import React, { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDialogFocusTrap } from '../useDialogFocusTrap';

interface TrapHarnessProps {
  onEscape?: () => void;
  showTrigger?: boolean;
}

function TrapHarness({ onEscape = jest.fn(), showTrigger = true }: TrapHarnessProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  useDialogFocusTrap({
    isOpen,
    dialogRef,
    initialFocusRef: firstRef,
    onEscape: () => onEscape(),
    restoreFocus: true,
  });

  return (
    <>
      {showTrigger && (
        <button type="button" onClick={() => setIsOpen(true)}>
          Open
        </button>
      )}
      <button type="button">Outside</button>
      {isOpen && (
        <div ref={dialogRef} tabIndex={-1} role="dialog" aria-label="Test dialog">
          <button ref={firstRef} type="button">First</button>
          <input aria-label="Middle" />
          <button type="button" onClick={() => setIsOpen(false)}>Last</button>
        </div>
      )}
    </>
  );
}

describe('useDialogFocusTrap', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('moves focus to the requested first control on open', async () => {
    const user = userEvent.setup();
    render(<TrapHarness />);

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('wraps forward Tab from the last control to the first', async () => {
    const user = userEvent.setup();
    render(<TrapHarness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    last.focus();

    await user.tab();

    expect(first).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Outside' })).not.toHaveFocus();
  });

  it('wraps backward Shift+Tab from the first control to the last', async () => {
    const user = userEvent.setup();
    render(<TrapHarness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    first.focus();

    await user.tab({ shift: true });

    expect(last).toHaveFocus();
  });

  it('pulls focus into the dialog when Tab starts outside the dialog', async () => {
    const user = userEvent.setup();
    render(<TrapHarness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    const outside = screen.getByRole('button', { name: 'Outside' });

    outside.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(first).toHaveFocus();

    outside.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('calls the current Escape callback without rebuilding the trap', async () => {
    const firstEscape = jest.fn();
    const secondEscape = jest.fn();
    const user = userEvent.setup();
    const { rerender } = render(<TrapHarness onEscape={firstEscape} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    rerender(<TrapHarness onEscape={secondEscape} />);
    await user.keyboard('{Escape}');

    expect(firstEscape).not.toHaveBeenCalled();
    expect(secondEscape).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the opener when the dialog closes', async () => {
    const user = userEvent.setup();
    render(<TrapHarness />);
    const opener = screen.getByRole('button', { name: 'Open' });

    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Last' }));

    expect(opener).toHaveFocus();
  });

  it('does not throw when the dialog ref is temporarily unavailable', () => {
    const onEscape = jest.fn();

    expect(() => {
      render(<TrapHarness onEscape={onEscape} showTrigger={false} />);
      fireEvent.keyDown(document, { key: 'Tab' });
      fireEvent.keyDown(document, { key: 'Escape' });
    }).not.toThrow();
  });
});
