import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionPanel from '../ActionPanel';
import { useWallet } from '@/contexts/WalletContext';
import { assertNoA11yViolations } from '@/test-utils/a11y';
import { DISPUTE_REASON_MAX_LENGTH } from '@/lib/disputeReason';
import type { ActionBlockCode, ActionId } from '@/lib/actionPanelPolicy';

jest.mock('@/contexts/WalletContext', () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = jest.mocked(useWallet);

const WALLET_ADDRESS = 'GBDGTR4S5O3K7I6E7K5QH3Y2W6Z4JFQ2X3C5V7M8N9P0Q1R2S3T4U5V6W7X';

const setWallet = (address: string | null) => {
  mockUseWallet.mockReturnValue({
    address,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
  });
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const disputeButton = () => screen.getByRole('button', { name: /open a dispute for this contract/i });
const reasonTextarea = () => screen.getByRole('textbox', { name: /reason/i }) as HTMLTextAreaElement;
const confirmDisputeButton = () => screen.getByRole('button', { name: /confirm dispute/i });
const confirmFundsButton = () => within(screen.getByRole('alertdialog')).getByRole('button', { name: /release funds/i });

async function openDisputeForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(disputeButton());
}

function typeReason(value: string) {
  fireEvent.change(reasonTextarea(), { target: { value } });
}

/**
 * Dispatches the same event twice inside a single `act` block so React batches
 * both into one render pass. This reproduces the real duplicate-submission
 * hazard: the second dispatch runs against the *pre-close* closure, which is
 * exactly the window a double click, a double tap, or an Enter-then-click lands
 * in. Dispatching via `fireEvent.click` twice would flush in between and
 * unmount the surface, hiding the bug.
 */
function dispatchTwice(element: Element, type: 'click' | 'submit') {
  act(() => {
    element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  });
}

const codesOf = (onBlockedAction: jest.Mock): ActionBlockCode[] =>
  onBlockedAction.mock.calls.map(([detail]) => detail.code);

const actionsOf = (onBlockedAction: jest.Mock): ActionId[] =>
  onBlockedAction.mock.calls.map(([detail]) => detail.action);

beforeEach(() => {
  setWallet(WALLET_ADDRESS);
});

// ---------------------------------------------------------------------------
// Accepted input
// ---------------------------------------------------------------------------

describe('ActionPanel validation boundaries — accepted input', () => {
  it('dispatches a trimmed reason exactly once for valid input', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await openDisputeForm(user);
    typeReason('  Milestone was never delivered  ');
    await user.click(confirmDisputeButton());

    expect(onDispute).toHaveBeenCalledTimes(1);
    expect(onDispute).toHaveBeenCalledWith('Milestone was never delivered');
  });

  it('accepts a reason of exactly the maximum length', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await openDisputeForm(user);
    const atLimit = 'a'.repeat(DISPUTE_REASON_MAX_LENGTH);
    typeReason(atLimit);
    await user.click(confirmDisputeButton());

    expect(onDispute).toHaveBeenCalledTimes(1);
    expect(onDispute).toHaveBeenCalledWith(atLimit);
  });

  it('accepts input whose trimmed length is under the limit even when raw length is at it', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await openDisputeForm(user);
    // 10 leading spaces + 490 characters == exactly the raw ceiling.
    typeReason(`${' '.repeat(10)}${'a'.repeat(490)}`);
    await user.click(confirmDisputeButton());

    expect(onDispute).toHaveBeenCalledWith('a'.repeat(490));
  });
});

// ---------------------------------------------------------------------------
// Boundary values
// ---------------------------------------------------------------------------

describe('ActionPanel validation boundaries — boundary values', () => {
  it('clamps over-long pasted input to the ceiling instead of discarding it', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await openDisputeForm(user);
    typeReason('b'.repeat(DISPUTE_REASON_MAX_LENGTH + 100));

    expect(reasonTextarea().value).toHaveLength(DISPUTE_REASON_MAX_LENGTH);
    expect(screen.getByText(`${DISPUTE_REASON_MAX_LENGTH} of ${DISPUTE_REASON_MAX_LENGTH} characters`, { selector: 'p[aria-hidden="true"]' })).toBeInTheDocument();

    await user.click(confirmDisputeButton());
    expect(onDispute).toHaveBeenCalledWith('b'.repeat(DISPUTE_REASON_MAX_LENGTH));
  });

  it('truncates on every keystroke past the ceiling and stays idempotent', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await openDisputeForm(user);
    const atLimit = 'c'.repeat(DISPUTE_REASON_MAX_LENGTH);
    typeReason(atLimit);
    await user.type(reasonTextarea(), 'dd');

    expect(reasonTextarea().value).toBe(atLimit);
  });

  it('rejects a whitespace-only reason', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await openDisputeForm(user);
    typeReason('   \n\t  ');
    await user.click(confirmDisputeButton());

    expect(onDispute).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Please provide a reason for the dispute.');
  });

  it('never offers a mutation for an unrecognised status', () => {
    const onReleaseFunds = jest.fn();
    const onDispute = jest.fn();
    const onSubmitMilestone = jest.fn();
    render(
      <ActionPanel
        status={'Refunded' as unknown as 'Active'}
        onReleaseFunds={onReleaseFunds}
        onDispute={onDispute}
        onSubmitMilestone={onSubmitMilestone}
        onViewSummary={jest.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /open a dispute for this contract/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit milestone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /release funds/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view contract summary details/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Rejected input — authorization re-checked at the mutation boundary
// ---------------------------------------------------------------------------

describe('ActionPanel validation boundaries — rejected at submit time', () => {
  it('blocks a dispute submit when the caller revokes the dispute reason mid-flow', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    const onBlockedAction = jest.fn();
    const { rerender } = render(
      <ActionPanel status="Active" onDispute={onDispute} onBlockedAction={onBlockedAction} />,
    );

    await openDisputeForm(user);
    typeReason('Work quality is below the agreed standard');

    // The parent revokes permission (or an unmet condition appears) while the
    // form is still open — the open form must not outlive its authorization.
    rerender(
      <ActionPanel
        status="Active"
        onDispute={onDispute}
        disabledReasons={{ dispute: 'You no longer have permission to dispute this contract.' }}
        onBlockedAction={onBlockedAction}
      />,
    );

    await user.click(confirmDisputeButton());

    expect(onDispute).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'You no longer have permission to dispute this contract.',
    );
    // Non-destructive: the form stays open with the typed reason intact.
    expect(screen.getByRole('group', { name: /describe the reason/i })).toBeInTheDocument();
    expect(reasonTextarea().value).toBe('Work quality is below the agreed standard');
    expect(onBlockedAction).toHaveBeenCalledWith({ action: 'dispute', code: 'caller_disabled' });
  });

  it('preserves the typed reason when the session goes offline mid-flow', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    const onBlockedAction = jest.fn();
    const { rerender } = render(
      <ActionPanel status="Active" onDispute={onDispute} onBlockedAction={onBlockedAction} />,
    );

    await openDisputeForm(user);
    typeReason('The client stopped responding to messages');

    rerender(
      <ActionPanel
        status="Active"
        onDispute={onDispute}
        disableMutations
        onBlockedAction={onBlockedAction}
      />,
    );

    await user.click(confirmDisputeButton());

    expect(onDispute).not.toHaveBeenCalled();
    // Regression guard: the form used to be closed, silently discarding input.
    expect(screen.getByRole('group', { name: /describe the reason/i })).toBeInTheDocument();
    expect(reasonTextarea().value).toBe('The client stopped responding to messages');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Actions are disabled while offline or viewing stale data.',
    );
    expect(onBlockedAction).toHaveBeenCalledWith({ action: 'dispute', code: 'mutations_disabled' });
  });

  it('succeeds on retry once the blocking condition clears (refusal is not sticky)', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    const onBlockedAction = jest.fn();
    const { rerender } = render(
      <ActionPanel status="Active" onDispute={onDispute} onBlockedAction={onBlockedAction} />,
    );

    await openDisputeForm(user);
    typeReason('Deliverable was rejected twice');

    rerender(
      <ActionPanel status="Active" onDispute={onDispute} disableMutations onBlockedAction={onBlockedAction} />,
    );
    await user.click(confirmDisputeButton());
    expect(onDispute).not.toHaveBeenCalled();

    rerender(<ActionPanel status="Active" onDispute={onDispute} onBlockedAction={onBlockedAction} />);
    await user.click(confirmDisputeButton());

    expect(onDispute).toHaveBeenCalledTimes(1);
    expect(onDispute).toHaveBeenCalledWith('Deliverable was rejected twice');
    expect(onBlockedAction).toHaveBeenCalledTimes(1);
  });

  it('blocks a release confirmation when the wallet disconnects while the dialog is open', async () => {
    const user = userEvent.setup();
    const onReleaseFunds = jest.fn();
    const onBlockedAction = jest.fn();
    const { rerender } = render(
      <ActionPanel status="Active" onReleaseFunds={onReleaseFunds} onBlockedAction={onBlockedAction} />,
    );

    const releaseFunds = screen.getByRole('button', { name: /release funds to the contractor/i });
    await user.click(releaseFunds);
    expect(screen.getByRole('alertdialog', { name: /confirm release funds/i })).toBeInTheDocument();

    setWallet(null);
    rerender(<ActionPanel status="Active" onReleaseFunds={onReleaseFunds} onBlockedAction={onBlockedAction} />);

    await user.click(confirmFundsButton());

    expect(onReleaseFunds).not.toHaveBeenCalled();
    // The dialog stays open with a diagnosable explanation.
    expect(screen.getByRole('alertdialog', { name: /confirm release funds/i })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Connect wallet to perform this action');
    expect(onBlockedAction).toHaveBeenCalledWith({ action: 'releaseFunds', code: 'wallet_disconnected' });

    // Cancel still works, so the user is never trapped in the dialog.
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('blocks a submit-milestone confirmation when the contract completes while the dialog is open', async () => {
    const user = userEvent.setup();
    const onSubmitMilestone = jest.fn();
    const onBlockedAction = jest.fn();
    const { rerender } = render(
      <ActionPanel status="Active" onSubmitMilestone={onSubmitMilestone} onBlockedAction={onBlockedAction} />,
    );

    await user.click(screen.getByRole('button', { name: /submit milestone for approval/i }));
    expect(screen.getByRole('dialog', { name: /confirm submit milestone/i })).toBeInTheDocument();

    // Another party completed the contract while the dialog was open.
    rerender(
      <ActionPanel status="Completed" onSubmitMilestone={onSubmitMilestone} onBlockedAction={onBlockedAction} />,
    );

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /submit milestone/i }));

    expect(onSubmitMilestone).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This action is no longer available for the current contract status.',
    );
    expect(onBlockedAction).toHaveBeenCalledWith({ action: 'submitMilestone', code: 'status_not_available' });
  });

  it('blocks a confirmation while contract data is loading', async () => {
    const user = userEvent.setup();
    const onReleaseFunds = jest.fn();
    const onBlockedAction = jest.fn();
    const { rerender } = render(
      <ActionPanel status="Active" onReleaseFunds={onReleaseFunds} onBlockedAction={onBlockedAction} />,
    );

    await user.click(screen.getByRole('button', { name: /release funds to the contractor/i }));
    rerender(
      <ActionPanel status="Active" onReleaseFunds={onReleaseFunds} isLoading onBlockedAction={onBlockedAction} />,
    );

    await user.click(confirmFundsButton());

    expect(onReleaseFunds).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Action is disabled while contract data is loading.');
    expect(onBlockedAction).toHaveBeenCalledWith({ action: 'releaseFunds', code: 'loading' });
  });

  it('keeps the pre-existing contract for a panel rendered without handlers', () => {
    // Compatibility guard: actions the parent did not wire stay visible and
    // clickable (parents express "unavailable" through `disabledReasons`), and
    // opening a confirmation still works. The gate must not start disabling
    // them, which would be a silent breaking change for existing callers.
    const onBlockedAction = jest.fn();
    render(<ActionPanel status="Active" onBlockedAction={onBlockedAction} />);

    expect(screen.getByRole('button', { name: /submit milestone for approval/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /release funds to the contractor/i })).not.toBeDisabled();
    expect(disputeButton()).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /submit milestone for approval/i }));
    expect(screen.getByRole('dialog', { name: /confirm submit milestone/i })).toBeInTheDocument();
    expect(onBlockedAction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Duplicate submissions
// ---------------------------------------------------------------------------

describe('ActionPanel validation boundaries — duplicate submissions', () => {
  it('emits a single dispute when the confirm button is double-clicked', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    const onBlockedAction = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} onBlockedAction={onBlockedAction} />);

    await openDisputeForm(user);
    typeReason('Duplicate submission guard');
    // "Confirm Dispute" is a type="submit" button, so the hazard it can create
    // is a doubled form submission; dispatch the submission twice in one tick.
    dispatchTwice(reasonTextarea().closest('form') as HTMLFormElement, 'submit');

    expect(onDispute).toHaveBeenCalledTimes(1);
    expect(onDispute).toHaveBeenCalledWith('Duplicate submission guard');
    expect(onBlockedAction).toHaveBeenCalledWith({ action: 'dispute', code: 'duplicate_submission' });
  });

  it('emits a single dispute when the form is submitted twice in one tick', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await openDisputeForm(user);
    typeReason('Enter then click');
    dispatchTwice(reasonTextarea().closest('form') as HTMLFormElement, 'submit');

    expect(onDispute).toHaveBeenCalledTimes(1);
    expect(onDispute).toHaveBeenCalledWith('Enter then click');
  });
  it('emits a single release when the confirmation dialog confirm is double-clicked', () => {
    const onReleaseFunds = jest.fn();
    render(<ActionPanel status="Active" onReleaseFunds={onReleaseFunds} />);

    fireEvent.click(screen.getByRole('button', { name: /release funds to the contractor/i }));
    dispatchTwice(confirmFundsButton(), 'click');

    expect(onReleaseFunds).toHaveBeenCalledTimes(1);
  });

  it('emits a single submit when the confirmation dialog confirm is double-clicked', () => {
    const onSubmitMilestone = jest.fn();
    render(<ActionPanel status="Active" onSubmitMilestone={onSubmitMilestone} />);

    fireEvent.click(screen.getByRole('button', { name: /submit milestone for approval/i }));
    dispatchTwice(
      within(screen.getByRole('dialog')).getByRole('button', { name: /submit milestone/i }),
      'click',
    );

    expect(onSubmitMilestone).toHaveBeenCalledTimes(1);
  });

  it('allows a new submission after the surface is re-opened (no permanent lock-out)', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await openDisputeForm(user);
    typeReason('First attempt');
    await user.click(confirmDisputeButton());
    expect(onDispute).toHaveBeenCalledTimes(1);

    await openDisputeForm(user);
    typeReason('Second attempt');
    await user.click(confirmDisputeButton());

    expect(onDispute).toHaveBeenCalledTimes(2);
    expect(onDispute).toHaveBeenLastCalledWith('Second attempt');
  });

  it('allows a new submission after a cancelled surface', async () => {
    const user = userEvent.setup();
    const onReleaseFunds = jest.fn();
    render(<ActionPanel status="Active" onReleaseFunds={onReleaseFunds} />);

    await user.click(screen.getByRole('button', { name: /release funds to the contractor/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /cancel/i }));

    await user.click(screen.getByRole('button', { name: /release funds to the contractor/i }));
    await user.click(confirmFundsButton());

    expect(onReleaseFunds).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Observability
// ---------------------------------------------------------------------------

describe('ActionPanel validation boundaries — observability', () => {
  it('reports a blocked action with only the action id and a stable code', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    const onBlockedAction = jest.fn();
    const { rerender } = render(
      <ActionPanel status="Active" onDispute={onDispute} onBlockedAction={onBlockedAction} />,
    );

    await openDisputeForm(user);
    typeReason('Sensitive dispute details that must not be logged');

    setWallet(null);
    rerender(<ActionPanel status="Active" onDispute={onDispute} onBlockedAction={onBlockedAction} />);
    await user.click(confirmDisputeButton());

    expect(onBlockedAction).toHaveBeenCalledTimes(1);
    expect(Object.keys(onBlockedAction.mock.calls[0][0]).sort()).toEqual(['action', 'code']);
    expect(actionsOf(onBlockedAction)).toEqual(['dispute']);
    expect(codesOf(onBlockedAction)).toEqual(['wallet_disconnected']);
  });

  it('logs refusals without leaking the reason text or the wallet address', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const user = userEvent.setup();
    const onDispute = jest.fn();
    const { rerender } = render(<ActionPanel status="Active" onDispute={onDispute} />);

    await openDisputeForm(user);
    const secret = 'Client owes me 4000 XLM for the final milestone';
    typeReason(secret);

    setWallet(null);
    rerender(<ActionPanel status="Active" onDispute={onDispute} />);
    await user.click(confirmDisputeButton());

    // The reporter receives a context label, the code and a structured meta
    // object; the whole payload is asserted so nothing extra can leak.
    const call = warn.mock.calls.find((args) => args[0] === '[ActionPanel.actionBlocked]');
    expect(call).toBeDefined();
    expect(call?.[1]).toBe('wallet_disconnected');
    expect(call?.[2]).toEqual({ action: 'dispute', code: 'wallet_disconnected' });

    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain(secret);
    expect(logged).not.toContain('4000 XLM');
    expect(logged).not.toContain(WALLET_ADDRESS);
    expect(logged).not.toContain('0x123');

    warn.mockRestore();
  });

  it('does not report anything for a successful submission', async () => {
    const onBlockedAction = jest.fn();
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} onBlockedAction={onBlockedAction} />);

    await openDisputeForm(user);
    typeReason('Nothing to report here');
    await user.click(confirmDisputeButton());

    expect(onDispute).toHaveBeenCalledTimes(1);
    expect(onBlockedAction).not.toHaveBeenCalled();
  });

  it('keeps the blocked surfaces accessible to assistive technology', async () => {
    const user = userEvent.setup();
    const { container } = render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await openDisputeForm(user);
    await assertNoA11yViolations(container);

    await user.click(confirmDisputeButton());
    await assertNoA11yViolations(container);
  });
});
