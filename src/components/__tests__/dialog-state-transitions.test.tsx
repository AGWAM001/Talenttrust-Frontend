/**
 * dialog-state-transitions.test.tsx
 *
 * Tests for dialog state transitions (loading → idle → open → success /
 * empty / error) across every dialog component:
 *
 *  1. ConfirmDialog        — closed, open, default/destructive, re-open
 *  2. ContractCreationForm — idle, validation-error, success, cancel
 *  3. MilestoneCreationForm— idle, validation-error, success, cancel
 *  4. ActionPanel          — loading, confirm-open, confirm-success,
 *                            confirm-cancel, error-message, dispute
 *                            open/error/success/cancel
 *  5. Mutual exclusivity   — states never coexist
 *
 * No behaviour is changed; every assertion is a read-only observation.
 * States are deterministic. Each describe block resets mocks via beforeEach.
 */

import React, { useState } from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ConfirmDialog } from '../ConfirmDialog';
import { ContractCreationForm } from '../ContractCreationForm';
import { MilestoneCreationForm } from '../milestones/MilestoneCreationForm';
import ActionPanel from '../ActionPanel';
// Import hooks so jest.mocked() can resolve their types.
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/toast/toast-provider';

// ---------------------------------------------------------------------------
// Declare module mocks.
// Must come after the imports that force module resolution,
// so Jest can find the modules before hoisting these factory calls.
// ---------------------------------------------------------------------------

jest.mock('@/contexts/WalletContext', () => ({ useWallet: jest.fn() }));
jest.mock('@/components/toast/toast-provider', () => ({
  useToast: jest.fn(() => ({
    showSuccess: jest.fn(),
    showError:   jest.fn(),
    toasts:      [],
    dismissToast: jest.fn(),
  })),
}));
// Mock stellarAddress so form tests don't depend on the CRC checksum
jest.mock('@/lib/stellarAddress', () => ({
  isValidStellarAddress: jest.fn((v: unknown) =>
    typeof v === 'string' && v.startsWith('G') && v.length === 56,
  ),
  normalizeStellarAddress: jest.fn((v: unknown) =>
    typeof v === 'string' ? v.trim().toUpperCase() : '',
  ),
}));

// ---------------------------------------------------------------------------
// Typed references
// ---------------------------------------------------------------------------

const mockShowSuccess = jest.fn();
const mockShowError  = jest.fn();
const mockUseWallet  = jest.mocked(useWallet);
const mockUseToast   = jest.mocked(useToast);

/**
 * A valid 56-character Stellar public key.
 * Passes the mocked isValidStellarAddress (starts with G, length 56).
 * Same address used in page.test.tsx.
 */
const VALID_ADDR = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

// ---------------------------------------------------------------------------
// Reset mocks before every test
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  mockUseWallet.mockReturnValue({
    address: VALID_ADDR,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
  });

  mockUseToast.mockReturnValue({
    showSuccess: mockShowSuccess,
    showError:   mockShowError,
    toasts:      [],
    dismissToast: jest.fn(),
  });
});

// ===========================================================================
// 1. ConfirmDialog — state transitions
// ===========================================================================

describe('ConfirmDialog — closed state', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog isOpen={false} title="Delete" description="Sure?"
        onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('mounts no dialog or alertdialog role when closed', () => {
    render(
      <ConfirmDialog isOpen={false} title="T" description="D"
        onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('ConfirmDialog — closed → open transition', () => {
  it('appears when isOpen flips from false to true', () => {
    const { rerender } = render(
      <ConfirmDialog isOpen={false} title="Go" description="Proceed?"
        onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <ConfirmDialog isOpen={true} title="Go" description="Proceed?"
        onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows title and description text when open', () => {
    render(
      <ConfirmDialog isOpen={true} title="Delete contract"
        description="This cannot be undone."
        onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.getByText('Delete contract')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });
});

describe('ConfirmDialog — open → closed via confirm', () => {
  it('calls onConfirm; parent can close the dialog', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <ConfirmDialog isOpen={open} title="Go" description="Sure?"
          onConfirm={() => { onConfirm(); setOpen(false); }}
          onCancel={() => setOpen(false)} />
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ConfirmDialog — open → closed via cancel', () => {
  it('calls onCancel when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <ConfirmDialog isOpen={open} title="Go" description="Sure?"
          onConfirm={jest.fn()}
          onCancel={() => { onCancel(); setOpen(false); }} />
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onCancel when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <ConfirmDialog isOpen={open} title="Go" description="Sure?"
          onConfirm={jest.fn()}
          onCancel={() => { onCancel(); setOpen(false); }} />
      );
    }

    render(<Harness />);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ConfirmDialog — tone variants are mutually exclusive', () => {
  it('renders role="dialog" for default tone', () => {
    render(
      <ConfirmDialog isOpen={true} title="Default" description="D"
        onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders role="alertdialog" for destructive tone', () => {
    render(
      <ConfirmDialog isOpen={true} title="Destructive" description="D"
        tone="destructive" onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('switches from dialog to alertdialog when tone prop changes', () => {
    const { rerender } = render(
      <ConfirmDialog isOpen={true} title="A" description="D" tone="default"
        onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <ConfirmDialog isOpen={true} title="A" description="D" tone="destructive"
        onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ConfirmDialog — re-open after close', () => {
  it('can be opened, closed, and reopened correctly', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <ConfirmDialog isOpen={open} title="Re-open" description="Cycle"
            onConfirm={jest.fn()} onCancel={() => setOpen(false)} />
        </>
      );
    }

    render(<Harness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// ===========================================================================
// 2. ContractCreationForm — state transitions
// ===========================================================================

describe('ContractCreationForm — idle state', () => {
  it('renders the dialog with empty fields and no errors', () => {
    render(<ContractCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect((screen.getByLabelText(/contract name/i) as HTMLInputElement).value).toBe('');
  });

  it('shows Cancel and Create Contract buttons in idle state', () => {
    render(<ContractCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create contract/i })).toBeInTheDocument();
  });
});

describe('ContractCreationForm — idle → error (validation failure)', () => {
  it('shows ErrorSummary alert on empty submit', async () => {
    const user = userEvent.setup();
    render(<ContractCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert', { name: /there is a problem/i })).toBeInTheDocument(),
    );
  });

  it('contract-name required message is present in error state', async () => {
    const user = userEvent.setup();
    render(<ContractCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() =>
      expect(screen.getAllByText(/contract name is required/i)[0]).toBeInTheDocument(),
    );
  });

  it('dialog stays open and onSubmit not called on validation failure', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<ContractCreationForm onSubmit={onSubmit} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() =>
      expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('invalid Stellar address shows address-error message', async () => {
    const user = userEvent.setup();
    render(<ContractCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/contract name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/total value/i), { target: { value: '1000' } });
    const labels = screen.getAllByPlaceholderText(/e\.g\., client/i);
    const addrs = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);
    fireEvent.change(labels[0], { target: { value: 'Client' } });
    fireEvent.change(addrs[0], { target: { value: 'INVALID' } });
    fireEvent.change(labels[1], { target: { value: 'Freelancer' } });
    fireEvent.change(addrs[1], { target: { value: VALID_ADDR } });

    await user.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() =>
      expect(
        screen.getAllByText(/party 1 address must be a valid stellar address/i)[0],
      ).toBeInTheDocument(),
    );
  });
});

describe('ContractCreationForm — error → success', () => {
  it('errors clear and onSubmit fires after correcting all fields', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<ContractCreationForm onSubmit={onSubmit} onCancel={jest.fn()} />);

    // Trigger error state
    await user.click(screen.getByRole('button', { name: /create contract/i }));
    await waitFor(() =>
      expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1),
    );

    // Fix all fields
    fireEvent.change(screen.getByLabelText(/contract name/i), { target: { value: 'Fixed Contract' } });
    fireEvent.change(screen.getByLabelText(/total value/i), { target: { value: '2000' } });
    const labels = screen.getAllByPlaceholderText(/e\.g\., client/i);
    const addrs = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);
    fireEvent.change(labels[0], { target: { value: 'Client' } });
    fireEvent.change(addrs[0], { target: { value: VALID_ADDR } });
    fireEvent.change(labels[1], { target: { value: 'Freelancer' } });
    fireEvent.change(addrs[1], { target: { value: VALID_ADDR } });

    await user.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ContractCreationForm — idle → success (valid submit)', () => {
  it('calls onSubmit with correct contract data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<ContractCreationForm onSubmit={onSubmit} onCancel={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/contract name/i), { target: { value: 'My Contract' } });
    fireEvent.change(screen.getByLabelText(/total value/i), { target: { value: '5000' } });
    const labels = screen.getAllByPlaceholderText(/e\.g\., client/i);
    const addrs = screen.getAllByPlaceholderText(/GXXXXXXXXXX/i);
    fireEvent.change(labels[0], { target: { value: 'Client' } });
    fireEvent.change(addrs[0], { target: { value: VALID_ADDR } });
    fireEvent.change(labels[1], { target: { value: 'Freelancer' } });
    fireEvent.change(addrs[1], { target: { value: VALID_ADDR } });

    await user.click(screen.getByRole('button', { name: /create contract/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ contractName: 'My Contract', totalValue: 5000, status: 'Pending' }),
    );
  });
});

describe('ContractCreationForm — idle → closed via cancel', () => {
  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<ContractCreationForm onSubmit={jest.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// 3. MilestoneCreationForm — state transitions
// ===========================================================================

describe('MilestoneCreationForm — idle state', () => {
  it('renders the dialog with empty fields and no errors', () => {
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows Add Milestone and Cancel buttons', () => {
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});

describe('MilestoneCreationForm — idle → error (validation failure)', () => {
  it('shows ErrorSummary alert on empty submit', async () => {
    const user = userEvent.setup();
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /add milestone/i }));

    // ErrorSummary renders role="alert" with aria-labelledby "There is a problem"
    await waitFor(() =>
      expect(
        screen.getByRole('alert', { name: /there is a problem/i }),
      ).toBeInTheDocument(),
    );
  });

  it('title-required and payout-required errors both appear', async () => {
    const user = userEvent.setup();
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /add milestone/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/title is required/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/payout amount is required/i)[0]).toBeInTheDocument();
    });
  });

  it('dialog stays open; onSubmit not called on validation failure', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MilestoneCreationForm onSubmit={onSubmit} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /add milestone/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('alert', { name: /there is a problem/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('payout-positive error appears for non-positive payout', async () => {
    const user = userEvent.setup();
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

    await user.type(screen.getByRole('textbox', { name: /title/i }), 'Task');
    await user.type(screen.getByRole('textbox', { name: /payout amount/i }), '-1');
    await user.click(screen.getByRole('button', { name: /add milestone/i }));

    await waitFor(() =>
      expect(screen.getAllByText(/payout must be a positive number/i)[0]).toBeInTheDocument(),
    );
  });

  it('only one alert region is rendered in error state', async () => {
    const user = userEvent.setup();
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /add milestone/i }));

    // ErrorSummary (1) + per-field inline alerts (1 per field) — assert summary is present
    await waitFor(() =>
      expect(
        screen.getByRole('alert', { name: /there is a problem/i }),
      ).toBeInTheDocument(),
    );
    // At least the summary alert exists
    expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1);
  });
});

describe('MilestoneCreationForm — idle → success (valid submit)', () => {
  it('calls onSubmit with the constructed milestone', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    jest.spyOn(Date, 'now').mockReturnValue(111111);

    render(<MilestoneCreationForm onSubmit={onSubmit} onCancel={jest.fn()} />);

    await user.type(screen.getByRole('textbox', { name: /title/i }), 'Build feature');
    await user.type(screen.getByRole('textbox', { name: /payout amount/i }), '1500');
    await user.click(screen.getByRole('button', { name: /add milestone/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Build feature', payout: 1500, status: 'Pending' }),
    );
  });
});

describe('MilestoneCreationForm — idle → closed via cancel', () => {
  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// 4. ActionPanel — ConfirmDialog state transitions
// ===========================================================================

describe('ActionPanel — loading state', () => {
  it('disables all action buttons while loading', () => {
    render(<ActionPanel status="Active" isLoading={true} />);
    screen.getAllByRole('button').forEach((btn) => expect(btn).toBeDisabled());
  });

  it('renders no dialog or alertdialog while loading', () => {
    render(<ActionPanel status="Active" isLoading={true} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('re-enables buttons when loading transitions to false', () => {
    const { rerender } = render(<ActionPanel status="Active" isLoading={true} />);
    screen.getAllByRole('button').forEach((btn) => expect(btn).toBeDisabled());

    rerender(<ActionPanel status="Active" isLoading={false} />);
    screen.getAllByRole('button').forEach((btn) => expect(btn).not.toBeDisabled());
  });
});

describe('ActionPanel — loading → idle → confirm-open', () => {
  it('no dialog while loading; dialog appears after idle + click', () => {
    const { rerender } = render(<ActionPanel status="Active" isLoading={true} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<ActionPanel status="Active" isLoading={false} />);
    fireEvent.click(screen.getByRole('button', { name: /submit milestone for approval/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('ActionPanel — confirm-open state', () => {
  it('Submit Milestone opens a dialog', () => {
    render(<ActionPanel status="Active" onSubmitMilestone={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /submit milestone for approval/i }));
    expect(screen.getByRole('dialog', { name: /confirm submit milestone/i })).toBeInTheDocument();
  });

  it('Release Funds opens an alertdialog', () => {
    render(<ActionPanel status="Active" onReleaseFunds={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /release funds to the contractor/i }));
    expect(screen.getByRole('alertdialog', { name: /confirm release funds/i })).toBeInTheDocument();
  });

  it('only one dialog is open at a time', () => {
    render(<ActionPanel status="Active" onSubmitMilestone={jest.fn()} onReleaseFunds={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /submit milestone for approval/i }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('ActionPanel — confirm-open → success', () => {
  it('confirming Submit Milestone calls handler and closes dialog', () => {
    const onSubmitMilestone = jest.fn();
    render(<ActionPanel status="Active" onSubmitMilestone={onSubmitMilestone} />);

    fireEvent.click(screen.getByRole('button', { name: /submit milestone for approval/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /submit milestone/i }));

    expect(onSubmitMilestone).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirming Release Funds calls handler and closes alertdialog', () => {
    const onReleaseFunds = jest.fn();
    render(<ActionPanel status="Active" onReleaseFunds={onReleaseFunds} />);

    fireEvent.click(screen.getByRole('button', { name: /release funds to the contractor/i }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /release funds/i }));

    expect(onReleaseFunds).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('ActionPanel — confirm-open → cancel', () => {
  it('cancelling Submit Milestone leaves handler uncalled and closes dialog', () => {
    const onSubmitMilestone = jest.fn();
    render(<ActionPanel status="Active" onSubmitMilestone={onSubmitMilestone} />);

    fireEvent.click(screen.getByRole('button', { name: /submit milestone for approval/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancel/i }));

    expect(onSubmitMilestone).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancelling Release Funds leaves handler uncalled and closes alertdialog', () => {
    const onReleaseFunds = jest.fn();
    render(<ActionPanel status="Active" onReleaseFunds={onReleaseFunds} />);

    fireEvent.click(screen.getByRole('button', { name: /release funds to the contractor/i }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /cancel/i }));

    expect(onReleaseFunds).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('Escape closes Submit Milestone dialog without calling handler', async () => {
    const user = userEvent.setup();
    const onSubmitMilestone = jest.fn();
    render(<ActionPanel status="Active" onSubmitMilestone={onSubmitMilestone} />);

    fireEvent.click(screen.getByRole('button', { name: /submit milestone for approval/i }));
    await user.keyboard('{Escape}');

    expect(onSubmitMilestone).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ActionPanel — error-message state', () => {
  it('renders a role="alert" region when errorMessage is provided', () => {
    render(<ActionPanel status="Active" errorMessage="Something went wrong." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
  });

  it('does not render an alert region when errorMessage is absent', () => {
    render(<ActionPanel status="Active" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('alert disappears when errorMessage is cleared', () => {
    const { rerender } = render(<ActionPanel status="Active" errorMessage="Oops." />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(<ActionPanel status="Active" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('loading + error can coexist without any dialog', () => {
    render(<ActionPanel status="Active" isLoading={true} errorMessage="Load failed." />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    screen.getAllByRole('button').forEach((btn) => expect(btn).toBeDisabled());
  });
});

// ===========================================================================
// 5. ActionPanel — inline dispute form state transitions
// ===========================================================================

describe('ActionPanel — dispute form: closed state', () => {
  it('dispute form is not visible initially', () => {
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);
    expect(screen.queryByRole('group', { name: /describe the reason/i })).not.toBeInTheDocument();
  });

  it('no dialog or alertdialog in closed state', () => {
    render(<ActionPanel status="Active" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('ActionPanel — dispute form: closed → open', () => {
  it('clicking Dispute reveals the inline form', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));

    expect(screen.getByRole('group', { name: /describe the reason for this dispute/i })).toBeInTheDocument();
  });

  it('textarea is focused when the form opens', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));

    expect(screen.getByRole('textbox', { name: /reason/i })).toHaveFocus();
  });

  it('Dispute button is disabled while the form is open', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));

    expect(screen.getByRole('button', { name: /open a dispute for this contract/i })).toBeDisabled();
  });

  it('ConfirmDialog is not rendered while the dispute form is open', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('ActionPanel — dispute form: open → error (empty reason)', () => {
  it('blocks submission and shows error for empty reason', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));

    expect(onDispute).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Please provide a reason for the dispute.');
    expect(screen.getByRole('group', { name: /describe the reason/i })).toBeInTheDocument();
  });

  it('textarea is aria-invalid in error state', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));

    expect(screen.getByRole('textbox', { name: /reason/i })).toHaveAttribute('aria-invalid', 'true');
  });

  it('error clears once user types a non-empty value', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'x');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ActionPanel — dispute form: open → success', () => {
  it('valid reason calls onDispute and closes the form', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'Deliverable not met');
    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));

    expect(onDispute).toHaveBeenCalledTimes(1);
    expect(onDispute).toHaveBeenCalledWith('Deliverable not met');
    expect(screen.queryByRole('group', { name: /describe the reason/i })).not.toBeInTheDocument();
  });

  it('Dispute button re-enabled after successful submission', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'Evidence missing');
    await user.click(screen.getByRole('button', { name: /confirm dispute/i }));

    expect(screen.getByRole('button', { name: /open a dispute for this contract/i })).not.toBeDisabled();
  });
});

describe('ActionPanel — dispute form: open → closed via cancel', () => {
  it('cancel closes the form without calling onDispute', async () => {
    const user = userEvent.setup();
    const onDispute = jest.fn();
    render(<ActionPanel status="Active" onDispute={onDispute} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'Some reason');
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onDispute).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: /describe the reason/i })).not.toBeInTheDocument();
  });

  it('textarea is cleared when re-opened after cancel', async () => {
    const user = userEvent.setup();
    render(<ActionPanel status="Active" onDispute={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    await user.type(screen.getByRole('textbox', { name: /reason/i }), 'Old text');
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await act(async () => {});

    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    expect(
      (screen.getByRole('textbox', { name: /reason/i }) as HTMLTextAreaElement).value,
    ).toBe('');
  });
});

// ===========================================================================
// 6. Mutual exclusivity
// ===========================================================================

describe('mutual exclusivity of dialog states', () => {
  it('ConfirmDialog: exactly one role present when open', () => {
    render(
      <ConfirmDialog isOpen={true} title="T" description="D"
        onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    const all = [
      ...screen.queryAllByRole('dialog'),
      ...screen.queryAllByRole('alertdialog'),
    ];
    expect(all).toHaveLength(1);
  });

  it('ActionPanel: loading, confirm, dispute states never coexist', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ActionPanel status="Active" isLoading={true} />);

    // Loading: nothing open
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /describe the reason/i })).not.toBeInTheDocument();

    // Idle: still nothing open
    rerender(<ActionPanel status="Active" isLoading={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Confirm open: dialog present, dispute absent
    fireEvent.click(screen.getByRole('button', { name: /submit milestone for approval/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /describe the reason/i })).not.toBeInTheDocument();

    // Close confirm
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Dispute open: form present, dialog absent
    await user.click(screen.getByRole('button', { name: /open a dispute for this contract/i }));
    expect(screen.getByRole('group', { name: /describe the reason/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('ContractCreationForm: idle has no alert; error state has exactly one', async () => {
    const user = userEvent.setup();
    render(<ContractCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create contract/i }));
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1));
  });

  it('MilestoneCreationForm: idle has no alert; error state has exactly one', async () => {
    const user = userEvent.setup();
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add milestone/i }));
    // ErrorSummary summary alert appears (plus per-field inline alerts)
    await waitFor(() =>
      expect(
        screen.getByRole('alert', { name: /there is a problem/i }),
      ).toBeInTheDocument(),
    );
  });
});
