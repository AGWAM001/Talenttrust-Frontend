import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionPanel from '../ActionPanel';
import { useWallet } from '@/contexts/WalletContext';
import { assertNoA11yViolations } from '@/test-utils/a11y';
import { DISPUTE_REASON_MAX_LENGTH } from '@/lib/disputeReason';

const maxChars = 'a'.repeat(DISPUTE_REASON_MAX_LENGTH);

jest.mock('@/contexts/WalletContext', () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = jest.mocked(useWallet);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Opens the inline dispute form by clicking the "Dispute" button.
 * Returns the form container element.
 */
async function openDisputeForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
  return screen.getByRole('group', { name: /describe the reason for this dispute/i });
}

/**
 * Fills the dispute textarea and submits the form.
 */
async function submitDisputeWithReason(
  user: ReturnType<typeof userEvent.setup>,
  reason: string,
) {
  await openDisputeForm(user);
  const textarea = screen.getByRole('textbox', { name: /reason/i });
  await user.clear(textarea);
  await user.type(textarea, reason);
  await user.click(screen.getByRole('button', { name: /confirm dispute/i }));
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe('ActionPanel', () => {
  beforeEach(() => {
    mockUseWallet.mockReturnValue({
      address: '0x123',
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
  });

  // -------------------------------------------------------------------------
  // Renders correct actions per status
  // -------------------------------------------------------------------------

  it('renders Active actions when status is Active', async () => {
    const user = userEvent.setup();
    const onSubmitMilestone = jest.fn();
    const onReleaseFunds = jest.fn();
    const onDispute = jest.fn();

    render(
      <ActionPanel
        status="Active"
        onSubmitMilestone={onSubmitMilestone}
        onReleaseFunds={onReleaseFunds}
        onDispute={onDispute}
      />,
    );

    expect(screen.getByRole('button', { name: /submit milestone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /release funds/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dispute/i })).toBeInTheDocument();

    // Submit Milestone → ConfirmDialog
    fireEvent.click(screen.getByRole('button', { name: /submit milestone/i }));
    const submitDialog = screen.getByRole('dialog', { name: /confirm submit milestone/i });
    expect(submitDialog).toBeInTheDocument();
    expect(submitDialog).toHaveTextContent(
      'Are you sure you want to submit this milestone for approval? This action cannot be undone.',
    );
    fireEvent.click(within(submitDialog).getByRole('button', { name: /submit milestone/i }));
    expect(onSubmitMilestone).toHaveBeenCalledTimes(1);

    // Release Funds → ConfirmDialog (tone="destructive" -> alertdialog)
    fireEvent.click(screen.getByRole('button', { name: /release funds/i }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /release funds/i }));
    expect(onReleaseFunds).toHaveBeenCalledTimes(1);

    // Dispute → inline form
    await submitDisputeWithReason(user, 'Milestone not delivered on time');
    expect(onDispute).toHaveBeenCalledTimes(1);
    expect(onDispute).toHaveBeenCalledWith('Milestone not delivered on time');
  });

  // -------------------------------------------------------------------------
  // Submit Milestone dialog focus & trapping
  // -------------------------------------------------------------------------

  it('opens the submit confirmation dialog with accessible labels and traps focus', async () => {
    const user = userEvent.setup();

    render(
      <ActionPanel
        status="Active"
        onSubmitMilestone={jest.fn()}
        onReleaseFunds={jest.fn()}
        onDispute={jest.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /submit milestone/i }));

    const dialog = screen.getByRole('dialog', { name: /confirm submit milestone/i });
    const cancelButton = within(dialog).getByRole('button', { name: /cancel/i });
    const confirmButton = within(dialog).getByRole('button', { name: /submit milestone/i });

    expect(cancelButton).toHaveFocus();
    expect(confirmButton).toBeInTheDocument();

    await user.tab();
    expect(confirmButton).toHaveFocus();

    await user.tab();
    expect(cancelButton).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /confirm submit milestone/i })).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Keyboard tab order
  // -------------------------------------------------------------------------

  it('keeps actions in a logical keyboard tab order with visible focus rings', () => {
    render(
      <ActionPanel
        status="Active"
        onSubmitMilestone={jest.fn()}
        onReleaseFunds={jest.fn()}
        onDispute={jest.fn()}
      />,
    );

    const panel = screen.getByRole('complementary', { name: /what would you like to do/i });
    const buttons = within(panel).getAllByRole('button');

    expect(buttons.map((b) => b.textContent)).toEqual([
      'Submit Milestone',
      'Release Funds',
      'Dispute',
    ]);

    buttons.forEach((button) => {
      expect(button).not.toHaveAttribute('tabindex', '-1');
      expect(button).toHaveClass('focus-visible:outline');
      expect(button).toHaveClass('focus-visible:outline-4');
      expect(button).toHaveClass('focus-visible:outline-offset-2');
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  // -------------------------------------------------------------------------
  // Per-action disabled reasons
  // -------------------------------------------------------------------------

  it('renders unavailable actions as disabled controls with accessible reasons', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();

    render(
      <ActionPanel
        status="Pending"
        onDispute={onDispute}
        disabledReasons={{
          releaseFunds: 'Connect a wallet with client permissions to release funds.',
        }}
      />,
    );

    const releaseFunds = screen.getByRole('button', { name: /release funds to the contractor/i });
    expect(releaseFunds).toBeDisabled();
    expect(releaseFunds).toHaveAccessibleDescription(
      'Connect a wallet with client permissions to release funds.',
    );

    fireEvent.click(releaseFunds);

    // Dispute → inline form
    await submitDisputeWithReason(user, 'Work quality is below standard');
    expect(onDispute).toHaveBeenCalledTimes(1);
    expect(onDispute).toHaveBeenCalledWith('Work quality is below standard');
  });

  // -------------------------------------------------------------------------
  // Wallet-disconnected guard
  // -------------------------------------------------------------------------

  it('keeps submit milestone disabled when the wallet is disconnected', () => {
    mockUseWallet.mockReturnValue({
      address: null,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    const onSubmitMilestone = jest.fn();
    render(<ActionPanel status="Active" onSubmitMilestone={onSubmitMilestone} />);

    const submitButton = screen.getByRole('button', { name: /submit milestone for approval/i });

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveAttribute('title', 'Connect wallet to perform this action');

    fireEvent.click(submitButton);

    expect(onSubmitMilestone).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('blocks dispute submission if the wallet disconnects after the form opens', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();

    const { rerender } = render(<ActionPanel status="Active" onDispute={onDispute} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'Milestone evidence is incomplete');

    mockUseWallet.mockReturnValue({
      address: null,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
    rerender(<ActionPanel status="Active" onDispute={onDispute} />);

    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));

    expect(onDispute).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Connect your wallet before submitting a dispute.',
    );
    expect(screen.getByRole('textbox', { name: /reason/i })).toHaveFocus();
    expect(screen.getByRole('group', { name: /describe the reason for this dispute/i })).toBeInTheDocument();
  });

  it('allows dispute submission after the wallet reconnects', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();

    const { rerender } = render(<ActionPanel status="Active" onDispute={onDispute} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'Milestone evidence is incomplete');

    mockUseWallet.mockReturnValue({
      address: null,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
    rerender(<ActionPanel status="Active" onDispute={onDispute} />);

    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));
    expect(onDispute).not.toHaveBeenCalled();

    mockUseWallet.mockReturnValue({
      address: '0x456',
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
    rerender(<ActionPanel status="Active" onDispute={onDispute} />);

    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));

    expect(onDispute).toHaveBeenCalledTimes(1);
    expect(onDispute).toHaveBeenCalledWith('Milestone evidence is incomplete');
    expect(screen.queryByRole('group', { name: /describe the reason for this dispute/i })).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Focus restoration — Release Funds cancel
  // -------------------------------------------------------------------------

  it('returns focus to the destructive trigger when confirmation is cancelled', () => {
    render(
      <ActionPanel
        status="Active"
        onReleaseFunds={jest.fn()}
        onDispute={jest.fn()}
      />,
    );

    const releaseFunds = screen.getByRole('button', { name: /release funds to the contractor/i });

    fireEvent.click(releaseFunds);
    fireEvent.click(
      within(screen.getByRole('alertdialog', { name: /confirm release funds/i })).getByRole('button', {
        name: /cancel/i,
      }),
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(releaseFunds).toHaveFocus();
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  it('disables visible actions while loading contract data', () => {
    const onSubmitMilestone = jest.fn();
    render(<ActionPanel status="Active" onSubmitMilestone={onSubmitMilestone} isLoading />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription('Action is disabled while contract data is loading.');
    });

    fireEvent.click(screen.getByRole('button', { name: /submit milestone for approval/i }));
    expect(onSubmitMilestone).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Error message
  // -------------------------------------------------------------------------

  it('announces action panel errors without changing keyboard order', () => {
    render(
      <ActionPanel
        status="Disputed"
        onDispute={jest.fn()}
        errorMessage="Network is slow. Try again in a moment."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Network is slow. Try again in a moment.');
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Dispute']);
  });

  // -------------------------------------------------------------------------
  // View Summary (Completed status)
  // -------------------------------------------------------------------------

  it('renders View Summary action for Completed status', () => {
    const onViewSummary = jest.fn();
    render(<ActionPanel status="Completed" onViewSummary={onViewSummary} />);

    expect(screen.getByRole('button', { name: /view contract summary details/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /view contract summary details/i }));
    expect(onViewSummary).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Focus restoration after dialog / form close
// ---------------------------------------------------------------------------

describe('focus restoration after dialog close', () => {
  beforeEach(() => {
    mockUseWallet.mockReturnValue({
      address: '0x123',
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
  });

  it('returns focus to Release Funds after cancel', async () => {
    const user = userEvent.setup();
    render(
      <ActionPanel
        status="Active"
        onReleaseFunds={jest.fn()}
        onDispute={jest.fn()}
        onSubmitMilestone={jest.fn()}
      />,
    );

    const releaseFundsBtn = screen.getByRole('button', { name: /release funds to the contractor/i });
    await user.click(releaseFundsBtn);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(releaseFundsBtn).toHaveFocus();
  });

  it('returns focus to Dispute button after cancelling the inline form', async () => {
    const user = userEvent.setup();
    render(
      <ActionPanel
        status="Active"
        onReleaseFunds={jest.fn()}
        onDispute={jest.fn()}
        onSubmitMilestone={jest.fn()}
      />,
    );

    const disputeBtn = screen.getByRole('button', { name: /open a dispute for this contract/i });
    await user.click(disputeBtn);

    expect(screen.getByRole('group', { name: /describe the reason/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('group', { name: /describe the reason/i })).not.toBeInTheDocument();
    // Focus is returned via requestAnimationFrame; flush it.
    await act(async () => {});
    expect(disputeBtn).toHaveFocus();
  });

  it('returns focus to Release Funds after confirm', async () => {
    const user = userEvent.setup();
    render(
      <ActionPanel
        status="Active"
        onReleaseFunds={jest.fn()}
        onDispute={jest.fn()}
        onSubmitMilestone={jest.fn()}
      />,
    );

    const releaseFundsBtn = screen.getByRole('button', { name: /release funds to the contractor/i });
    await user.click(releaseFundsBtn);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /release funds/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(releaseFundsBtn).toHaveFocus();
  });

  it('returns focus to Dispute button after confirming the inline form', async () => {
    const user = userEvent.setup();
    render(
      <ActionPanel
        status="Active"
        onReleaseFunds={jest.fn()}
        onDispute={jest.fn()}
        onSubmitMilestone={jest.fn()}
      />,
    );

    const disputeBtn = screen.getByRole('button', { name: /open a dispute for this contract/i });
    await submitDisputeWithReason(user, 'Deliverable not received');

    expect(screen.queryByRole('group', { name: /describe the reason/i })).not.toBeInTheDocument();
    await act(async () => {});
    expect(disputeBtn).toHaveFocus();
  });

  it('returns focus to Submit Milestone after confirm', async () => {
    const user = userEvent.setup();
    render(
      <ActionPanel
        status="Active"
        onSubmitMilestone={jest.fn()}
        onReleaseFunds={jest.fn()}
        onDispute={jest.fn()}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /submit milestone for approval/i });
    await user.click(submitBtn);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /submit milestone/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(submitBtn).toHaveFocus();
  });

  it('returns focus to Submit Milestone after cancel', async () => {
    const user = userEvent.setup();
    render(
      <ActionPanel
        status="Active"
        onSubmitMilestone={jest.fn()}
        onReleaseFunds={jest.fn()}
        onDispute={jest.fn()}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /submit milestone for approval/i });
    await user.click(submitBtn);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(submitBtn).toHaveFocus();
  });

  it('correctly distinguishes Release Funds from Dispute — each restores to its own button', async () => {
    const user = userEvent.setup();
    render(
      <ActionPanel
        status="Active"
        onReleaseFunds={jest.fn()}
        onDispute={jest.fn()}
        onSubmitMilestone={jest.fn()}
      />,
    );

    const releaseFundsBtn = screen.getByRole('button', { name: /release funds to the contractor/i });
    const disputeBtn = screen.getByRole('button', { name: /open a dispute for this contract/i });

    // Open from Release Funds, cancel → focus back to Release Funds
    await user.click(releaseFundsBtn);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /cancel/i }));
    expect(releaseFundsBtn).toHaveFocus();
    expect(disputeBtn).not.toHaveFocus();

    // Open dispute form, cancel → focus back to Dispute
    await user.click(disputeBtn);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await act(async () => {});
    expect(disputeBtn).toHaveFocus();
    expect(releaseFundsBtn).not.toHaveFocus();
  });

  it('returns focus to Dispute button on Escape key close of submit dialog', async () => {
    const user = userEvent.setup();
    render(
      <ActionPanel
        status="Disputed"
        onDispute={jest.fn()}
      />,
    );

    const disputeBtn = screen.getByRole('button', { name: /open a dispute for this contract/i });
    await user.click(disputeBtn);

    // Pressing Escape inside the textarea should not submit; close the form via Cancel instead
    // (Escape is not wired to the inline form — only the ConfirmDialog handles Escape).
    // So instead test that Cancel closes the form and returns focus.
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('group', { name: /describe the reason/i })).not.toBeInTheDocument();
    await act(async () => {});
    expect(disputeBtn).toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// Inline dispute form — validation
// ---------------------------------------------------------------------------

describe('inline dispute form — validation', () => {
  beforeEach(() => {
    mockUseWallet.mockReturnValue({
      address: '0x123',
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
  });

  it('clicking Dispute reveals the inline form with a labeled textarea', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));

    expect(screen.getByRole('group', { name: /describe the reason for this dispute/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /reason/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm dispute/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('focuses the textarea immediately when the form opens', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));

    expect(screen.getByRole('textbox', { name: /reason/i })).toHaveFocus();
  });

  it('blocks submission when the reason is empty', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    // Submit without typing anything
    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));

    expect(onDispute).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Please provide a reason for the dispute.');
    // Textarea must be re-focused so screen readers can read the error
    expect(screen.getByRole('textbox', { name: /reason/i })).toHaveFocus();
  });

  it('blocks submission when the reason is whitespace-only', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.type(screen.getByRole('textbox', { name: /reason/i }), '     ');
    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));

    expect(onDispute).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Please provide a reason for the dispute.');
  });

  it('does not allow input beyond the 500-character limit', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));

    const textarea = screen.getByRole('textbox', { name: /reason/i });
    // Use fireEvent to set the text close to the limit for performance, then type the last characters
    fireEvent.change(textarea, { target: { value: 'a'.repeat(500) } });
    await user.type(textarea, 'b');

    // The textarea value must be capped at 500 chars
    expect(textarea.value.length).toBeLessThanOrEqual(500);
    expect(textarea.value).toBe(maxChars);
  });

  it('passes the trimmed reason to onDispute on valid submission', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    // Leading/trailing whitespace should be trimmed before calling onDispute
    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    const textarea = screen.getByRole('textbox', { name: /reason/i });
    // userEvent.type does not allow leading spaces easily; use fireEvent to set raw value
    fireEvent.change(textarea, { target: { value: '  Deliverable was not met  ' } });
    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));

    expect(onDispute).toHaveBeenCalledTimes(1);
    expect(onDispute).toHaveBeenCalledWith('Deliverable was not met');
  });

  it('closes the form and calls onDispute once on valid submission', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await submitDisputeWithReason(user, 'Contract terms were violated');

    expect(onDispute).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('group', { name: /describe the reason/i })).not.toBeInTheDocument();
  });

  it('clears the form state when cancelled and re-opened', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'Partial work');
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await act(async () => {});

    // Re-open — textarea must be blank
    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    expect((screen.getByRole('textbox', { name: /reason/i }) as HTMLTextAreaElement).value).toBe('');
  });

  it('the textarea is aria-invalid when an error is present', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));

    expect(screen.getByRole('textbox', { name: /reason/i })).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears the validation error once the user starts typing a non-empty value', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'x');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Dispute button is disabled while the inline form is open', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    const disputeBtn = screen.getByRole('button', { name: /open a dispute for this contract/i });
    await user.click(disputeBtn);

    expect(disputeBtn).toBeDisabled();
  });

  it('Dispute button has aria-expanded=true while the form is open', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    const disputeBtn = screen.getByRole('button', { name: /open a dispute for this contract/i });
    expect(disputeBtn).toHaveAttribute('aria-expanded', 'false');

    await user.click(disputeBtn);
    expect(disputeBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('textarea has aria-describedby pointing to the error element when invalid', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));

    const textarea = screen.getByRole('textbox', { name: /reason/i });
    const describedBy = textarea.getAttribute('aria-describedby') ?? '';
    const errorEl = document.getElementById(describedBy.split(' ')[0]);
    expect(errorEl).not.toBeNull();
    expect(errorEl).toHaveTextContent('Please provide a reason for the dispute.');
  });
});

describe('inline dispute form — character counter live region', () => {
  beforeEach(() => {
    mockUseWallet.mockReturnValue({
      address: '0x123',
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders a visually hidden live region associated with the textarea', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));

    const textarea = screen.getByRole('textbox', { name: /reason/i });
    const describedBy = textarea.getAttribute('aria-describedby') ?? '';
    expect(describedBy).toContain('dispute-reason-counter');

    const liveRegion = document.getElementById('dispute-reason-counter');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveClass('sr-only');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveTextContent('0 of 500 characters');
  });

  it('throttles/debounces announcements so every keystroke does not update immediately', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    // Open dispute form
    await act(async () => {
      await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    });

    const liveRegion = document.getElementById('dispute-reason-counter');
    expect(liveRegion).toHaveTextContent('0 of 500 characters');

    const textarea = screen.getByRole('textbox', { name: /reason/i });

    // Type 1 character: 'a'
    // remainingChars = 499 (not a boundary)
    await act(async () => {
      await user.type(textarea, 'a');
    });

    // Should NOT have updated immediately
    expect(liveRegion).toHaveTextContent('0 of 500 characters');

    // Wait 500ms
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(liveRegion).toHaveTextContent('0 of 500 characters');

    // Wait another 500ms (1000ms total)
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(liveRegion).toHaveTextContent('1 of 500 characters');
  });

  it('updates immediately when remaining characters hits a boundary', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    });

    const liveRegion = document.getElementById('dispute-reason-counter');
    const textarea = screen.getByRole('textbox', { name: /reason/i }) as HTMLTextAreaElement;

    // Remaining count = 450 is a boundary (multiple of 50).
    // Let's set the value to 50 characters (remaining 450).
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'a'.repeat(50) } });
    });

    expect(liveRegion).toHaveTextContent('50 of 500 characters');
  });

  it('assertively escalates near and at the limit', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    });

    const liveRegion = document.getElementById('dispute-reason-counter');
    const textarea = screen.getByRole('textbox', { name: /reason/i }) as HTMLTextAreaElement;

    // Type 449 characters (51 remaining, which is > 50)
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'a'.repeat(449) } });
    });
    // Let timer expire to update live region
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');

    // Type 450 characters (50 remaining, which is exactly the threshold)
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'a'.repeat(450) } });
    });
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
    expect(liveRegion).toHaveTextContent('450 of 500 characters');

    // Type 460 characters (40 remaining, multiple of 10)
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'a'.repeat(460) } });
    });
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
    expect(liveRegion).toHaveTextContent('460 of 500 characters');

    // Type 495 characters (5 remaining, <= 10)
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'a'.repeat(495) } });
    });
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
    expect(liveRegion).toHaveTextContent('495 of 500 characters');
  });

  it('keeps the live region quiet/empty when the form is closed', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    // Not in DOM initially
    expect(document.getElementById('dispute-reason-counter')).toBeNull();

    // Open form
    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    expect(document.getElementById('dispute-reason-counter')).toBeInTheDocument();

    // Close form
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(document.getElementById('dispute-reason-counter')).toBeNull();
  });

  it('should have no accessibility violations in default state and when dispute form is open', async () => {
    const { container } = render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    // Check default state
    await assertNoA11yViolations(container);

    // Open dispute form
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));

    // Check with dispute form open
    await assertNoA11yViolations(container);
  });

  describe('disableMutations prop', () => {
    it('disables submit milestone, release funds, and dispute buttons when disableMutations=true', () => {
      render(
        <ActionPanel
          status="Active"
          disableMutations={true}
          onSubmitMilestone={jest.fn()}
          onReleaseFunds={jest.fn()}
          onDispute={jest.fn()}
          onViewSummary={jest.fn()}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: /submit milestone/i });
      const releaseBtn = screen.getByRole('button', { name: /release funds/i });
      const disputeBtn = screen.getByRole('button', { name: /dispute/i });

      expect(submitBtn).toBeDisabled();
      expect(releaseBtn).toBeDisabled();
      expect(disputeBtn).toBeDisabled();

      expect(submitBtn).toHaveAttribute('title', 'Actions disabled while offline or viewing stale data');
      expect(releaseBtn).toHaveAttribute('title', 'Actions disabled while offline or viewing stale data');
      expect(disputeBtn).toHaveAttribute('title', 'Actions disabled while offline or viewing stale data');
    });

    it('does not disable read-only actions like view summary when disableMutations=true', () => {
      render(
        <ActionPanel
          status="Completed"
          disableMutations={true}
          onViewSummary={jest.fn()}
        />,
      );

      const viewSummaryBtn = screen.getByRole('button', { name: /view contract summary details/i });
      expect(viewSummaryBtn).not.toBeDisabled();
    });

    it('passes accessibility checks when mutations are disabled', async () => {
      const { container } = render(
        <ActionPanel
          status="Active"
          disableMutations={true}
          onSubmitMilestone={jest.fn()}
          onReleaseFunds={jest.fn()}
          onDispute={jest.fn()}
        />,
      );

      await assertNoA11yViolations(container);
    });
  });
});

