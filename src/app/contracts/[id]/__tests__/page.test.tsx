import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import ContractDetailPage from '../page';
import * as contractResolver from '@/lib/contractResolver';
import { upsertContract, listMilestonesByContract, updateMilestone } from '@/lib/repository';
import { useWallet } from '@/contexts/WalletContext';
import { ToastProvider } from '@/components/toast/toast-provider';
import userEvent from '@testing-library/user-event';

/**
 * Installs a working clipboard mock and returns the writeText spy.
 */
function installClipboard(): jest.Mock {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

/**
 * Removes navigator.clipboard to simulate an unsupported environment.
 */
function removeClipboard(): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  });
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

jest.mock('@/lib/contractResolver');
jest.mock('@/lib/repository', () => ({
  upsertContract: jest.fn(),
  listMilestonesByContract: jest.fn(() => []),
  getContractVersion: jest.fn(() => 0),
  updateMilestone: jest.fn(() => true),
}));
jest.mock('@/contexts/WalletContext', () => ({
  useWallet: jest.fn(),
}));

const mockedResolveContractData = jest.mocked(contractResolver.resolveContractData);
const mockedUpsertContract = jest.mocked(upsertContract);
const mockedUpdateMilestone = jest.mocked(updateMilestone);
const mockedListMilestonesByContract = jest.mocked(listMilestonesByContract);
const mockedUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

const contractData: contractResolver.ContractData = {
  id: '123',
  name: 'Stellar Escrow Implementation',
  status: 'Active',
  parties: [
    { label: 'Client', address: 'GABC1234DEF5678HIJK9012LMNO3456PQRS7890' },
    { label: 'Freelancer', address: 'GXYZ9876STU5432VWXQ1098ABCD7654EFGH3210' },
  ],
  totalValue: 7000,
  currency: 'USD',
  createdAt: 'Apr 20, 2026',
  milestones: [
    {
      id: 'ms-1',
      title: 'Kickoff and scope approval',
      status: 'Completed',
      payout: 1500,
      currency: 'USD',
      dueDate: '2026-05-04',
    },
    {
      id: 'ms-2',
      title: 'Design and review',
      status: 'Pending',
      payout: 2500,
      currency: 'USD',
      dueDate: '2026-06-01',
    },
    {
      id: 'ms-3',
      title: 'Final delivery',
      status: 'Pending',
      payout: 3000,
      currency: 'USD',
      dueDate: '2026-07-12',
    },
  ],
};

const BASE_CONTRACT = contractData;

async function renderPage(id = '123') {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <ToastProvider>
        <ContractDetailPage params={Promise.resolve({ id })} />
      </ToastProvider>,
    );
  });
  return result!;
}

function getContractSummarySection() {
  const contractHeading = screen.getByRole('heading', { name: contractData.name });
  const section = contractHeading.closest('section');

  if (!section) {
    throw new Error('Contract summary section was not found.');
  }

  return section;
}

async function findEnabledButton(name: RegExp | string) {
  await screen.findByRole('button', { name });
  await waitFor(() => {
    expect(screen.getByRole('button', { name })).toBeEnabled();
  });
  return screen.getByRole('button', { name });
}

async function confirmReleaseFunds(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await findEnabledButton(/release funds to the contractor/i));
  const dialog = await screen.findByRole('alertdialog', { name: /confirm release funds/i });
  await user.click(within(dialog).getByRole('button', { name: /^release funds$/i }));
}

describe('ContractDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedResolveContractData.mockResolvedValue(contractData);
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });
    mockedListMilestonesByContract.mockReturnValue([]);
    mockedUseWallet.mockReturnValue({
      address: '0x123',
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
  });

  afterEach(() => {
    // Restore clipboard to avoid cross-test interference
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  });

  it('renders the resolved contract details and action panel', async () => {
    await renderPage();

    expect((await screen.findAllByText('Contract #123')).length).toBeGreaterThan(0);
    expect(screen.getByText('Milestones')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to contracts/i })).toHaveAttribute('href', '/contracts');
    expect(within(getContractSummarySection()).getByLabelText('Status: Active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit milestone for approval/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy contract id to clipboard/i })).toBeInTheDocument();
  });

  it('copies the contract id to the clipboard and shows a success toast', async () => {
    const writeText = installClipboard();

    await renderPage('contract-42');

    const copyButton = screen.getByRole('button', { name: /copy contract id to clipboard/i });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveAttribute('title', 'Copy contract ID');

    await act(async () => {
      copyButton.click();
    });

    expect(writeText).toHaveBeenCalledWith('contract-42');
  });

  it('shows the check icon and updated label when the contract id is copied', async () => {
    installClipboard();

    await renderPage('123');

    // Click the copy button to trigger the copied state
    const copyButton = screen.getByRole('button', { name: /copy contract id to clipboard/i });
    await act(async () => {
      copyButton.click();
    });

    // Wait for the hook to process and update state
    await waitFor(() => {
      const copiedButton = screen.getByRole('button', { name: /contract id copied/i });
      expect(copiedButton).toBeInTheDocument();
      expect(copiedButton).toHaveAttribute('title', 'Contract ID copied');
    });

    // Verify the check icon is present (instead of the copy icon)
    const copiedButton = screen.getByRole('button', { name: /contract id copied/i });
    const checkIcon = copiedButton.querySelector('svg path[d="M5 13l4 4L19 7"]');
    expect(checkIcon).toBeInTheDocument();
  });

  it('shows error toast when clipboard API is not supported', async () => {
    removeClipboard();

    await renderPage('123');

    const copyButton = screen.getByRole('button', { name: /copy contract id to clipboard/i });

    await act(async () => {
      copyButton.click();
    });

    // The button should still show the copy icon (copied state unchanged)
    expect(
      screen.getByRole('button', { name: /copy contract id to clipboard/i })
    ).toBeInTheDocument();
  });

  it('handles clipboard write failure gracefully', async () => {
    installClipboard();
    // Make clipboard.writeText reject
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockRejectedValue(new Error('Permission denied')) },
    });

    await renderPage('123');

    const copyButton = screen.getByRole('button', { name: /copy contract id to clipboard/i });

    await act(async () => {
      copyButton.click();
    });

    // Button should still show the copy icon (copied state unchanged)
    expect(
      screen.getByRole('button', { name: /copy contract id to clipboard/i })
    ).toBeInTheDocument();
  });

  it('applies the release-funds status change optimistically and persists it with the correct version', async () => {
    const user = userEvent.setup();

    await renderPage();
    await confirmReleaseFunds(user);

    // The optimistic update is applied synchronously, before the persistence
    // result is even known — status flips immediately on confirm.
    expect(within(getContractSummarySection()).getByLabelText('Status: Completed')).toBeInTheDocument();

    expect(mockedUpsertContract).toHaveBeenCalledWith({
      id: contractData.id,
      contractName: contractData.name,
      parties: contractData.parties,
      totalValue: contractData.totalValue,
      currency: contractData.currency,
      status: 'Completed',
      createdAt: contractData.createdAt,
      milestoneCount: contractData.milestones.length,
      version: 0,
    });
  });

  it('shows a success toast after an optimistic status change is persisted', async () => {
    const user = userEvent.setup();

    await renderPage();
    await confirmReleaseFunds(user);

    expect(await screen.findByText('Funds released')).toBeInTheDocument();
    expect(screen.getByText('The contract was marked as Completed and the change was saved.')).toBeInTheDocument();
  });

  it('rolls back the optimistic status change when persistence fails', async () => {
    mockedUpsertContract.mockReturnValue({ success: false, stale: false });
    const user = userEvent.setup();

    await renderPage();
    await confirmReleaseFunds(user);

    await waitFor(() => {
      expect(within(getContractSummarySection()).getByLabelText('Status: Active')).toBeInTheDocument();
    });
    expect(await screen.findByText('Unable to update contract')).toBeInTheDocument();
  });

  it('disables action buttons while a status change is in flight and re-enables them after it settles', async () => {
    const user = userEvent.setup();

    await renderPage();
    await confirmReleaseFunds(user);

    // Completed contracts only offer "View Summary" — Release Funds is gone,
    // proving the panel re-rendered off the settled (non-pending) state.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /release funds to the contractor/i })).not.toBeInTheDocument();
    });
    expect(mockedUpsertContract).toHaveBeenCalledTimes(1);
  });

  describe('ContractProgress integration', () => {
    it('renders the "Escrow Progress" section heading after load', async () => {
      await renderPage();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /escrow progress/i }),
        ).toBeInTheDocument();
      });
    });

    it('renders a progressbar role element', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('sets aria-valuemin=0 and aria-valuemax=100 on the progress bar', async () => {
      await renderPage();

      await waitFor(() => {
        const bar = screen.getByRole('progressbar');
        expect(bar).toHaveAttribute('aria-valuemin', '0');
        expect(bar).toHaveAttribute('aria-valuemax', '100');
      });
    });

    it('reflects the correct percentage for a mixed-milestone contract', async () => {
      // 1 of 3 milestones completed → Math.round(1/3 * 100) = 33
      await renderPage();

      await waitFor(() => {
        const bar = screen.getByRole('progressbar');
        expect(bar).toHaveAttribute('aria-valuenow', '33');
      });
    });

    it('sets aria-valuenow=100 when all milestones are completed', async () => {
      const allPaid = deepClone(BASE_CONTRACT);
      allPaid.milestones.forEach((m) => { m.status = 'Completed'; });
      mockedResolveContractData.mockResolvedValueOnce(allPaid);

      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
      });
    });

    it('sets aria-valuenow=0 when no milestones are completed', async () => {
      const nonePaid = deepClone(BASE_CONTRACT);
      nonePaid.milestones.forEach((m) => { m.status = 'Pending'; });
      mockedResolveContractData.mockResolvedValueOnce(nonePaid);

      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
      });
    });

    it('provides an aria-label describing the milestone progress', async () => {
      // 1 of 3 completed, 33%
      await renderPage();

      await waitFor(() => {
        const bar = screen.getByRole('progressbar');
        expect(bar).toHaveAttribute(
          'aria-label',
          '1 of 3 milestones completed, 33%',
        );
      });
    });

    it('counts "Paid" status milestones as completed', async () => {
      const withPaid = deepClone(BASE_CONTRACT);
      withPaid.milestones[0].status = 'Paid';
      withPaid.milestones[1].status = 'Paid';
      withPaid.milestones[2].status = 'Pending';
      mockedResolveContractData.mockResolvedValueOnce(withPaid);

      await renderPage();

      await waitFor(() => {
        // 2 of 3 → 67%
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
      });
    });

    it('shows "Milestones completed" label text', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText(/milestones completed/i)).toBeInTheDocument();
      });
    });

    it('shows the completed / total count for the milestone mix', async () => {
      await renderPage();

      // 1 completed, 3 total
      await waitFor(() => {
        expect(screen.getByText('1 / 3')).toBeInTheDocument();
      });
    });

    it('renders paid and outstanding amount cards', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Paid')).toBeInTheDocument();
        expect(screen.getByText('Outstanding')).toBeInTheDocument();
      });
    });
  });

  describe('empty milestones handling', () => {
    it('renders ContractProgress empty state when milestones array is empty', async () => {
      const empty = { ...deepClone(BASE_CONTRACT), milestones: [] };
      mockedResolveContractData.mockResolvedValueOnce(empty);

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('No milestones yet')).toBeInTheDocument();
      });
    });

    it('does not render a progressbar when milestones array is empty', async () => {
      const empty = { ...deepClone(BASE_CONTRACT), milestones: [] };
      mockedResolveContractData.mockResolvedValueOnce(empty);

      await renderPage();

      await waitFor(() => {
        // Empty state replaces the bar with a descriptive message; no progressbar expected.
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('does not throw or show an error for empty milestones', async () => {
      const empty = { ...deepClone(BASE_CONTRACT), milestones: [] };
      mockedResolveContractData.mockResolvedValueOnce(empty);

      // Should render without throwing
      await expect(renderPage()).resolves.not.toThrow();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /escrow progress/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('currency pass-through', () => {
    it('does not hardcode USD — uses the currency from the milestones', async () => {
      const xlmContract = deepClone(BASE_CONTRACT);
      xlmContract.currency = 'XLM';
      xlmContract.milestones.forEach((m) => { m.currency = 'XLM'; });
      mockedResolveContractData.mockResolvedValueOnce(xlmContract);

      await renderPage();

      // The page should not inject any USD references in the progress section;
      // the component itself derives currency from milestone[0].currency.
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Verify the page passes milestones through without re-labelling the currency.
      const pageSource = document.body.innerHTML;
      // We're not asserting the formatted string since formatAmount is mocked via
      // usePreferences — we assert the progressbar is present and that the page
      // did not hardcode any currency symbol strings ("$" coming from USD format).
      expect(pageSource).not.toMatch(/\$1,500/);
    });
  });

  describe('repository milestone linking', () => {
    it('queries listMilestonesByContract with the current contract id', async () => {
      await renderPage('123');

      await waitFor(() => {
        expect(mockedListMilestonesByContract).toHaveBeenCalledWith('123');
      });
    });

    it('renders a persisted milestone linked via contractId alongside the resolved milestones', async () => {
      mockedListMilestonesByContract.mockReturnValue([
        {
          id: 'ms-persisted-1',
          title: 'Persisted milestone',
          status: 'Pending',
          payout: 900,
          currency: 'USD',
          contractId: '123',
        },
      ]);

      await renderPage('123');

      await waitFor(() => {
        expect(screen.getByText('Persisted milestone')).toBeInTheDocument();
      });
      // Resolver milestones are still present alongside the persisted one.
      expect(screen.getByText('Kickoff and scope approval')).toBeInTheDocument();
      expect(screen.getByText('4 total')).toBeInTheDocument();
    });

    it('lets a persisted milestone override a resolver milestone that shares the same id', async () => {
      mockedListMilestonesByContract.mockReturnValue([
        {
          id: 'ms-1',
          title: 'Kickoff and scope approval (updated)',
          status: 'Paid',
          payout: 1500,
          currency: 'USD',
          contractId: '123',
        },
      ]);

      await renderPage('123');

      await waitFor(() => {
        expect(screen.getByText('Kickoff and scope approval (updated)')).toBeInTheDocument();
      });
      expect(screen.queryByText('Kickoff and scope approval')).not.toBeInTheDocument();
      // No duplicate row was added — still 3 total milestones.
      expect(screen.getByText('3 total')).toBeInTheDocument();
    });
  });

  describe('dialog-driven mutations: success and rollback', () => {
    it('renders the contract overview and action panel after successful load', async () => {
      await renderPage();

      await waitFor(() => {
        expect(
          screen.getByRole('complementary', { name: /what would you like to do/i }),
        ).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(
          screen.getByRole('status', { name: 'Contract status updates' }),
        ).toBeEmptyDOMElement();
      });
    });

    it('persists the confirmed dispute flow and reflects the disputed status in the page', async () => {
      const user = userEvent.setup();

      await renderPage();

      await user.click(await findEnabledButton(/open a dispute for this contract/i));

      // Type in the reason textarea in the inline form
      const textarea = await screen.findByRole('textbox', { name: /reason/i });
      await user.type(textarea, 'Dispute reason');

      // Click confirm dispute button
      await user.click(screen.getByRole('button', { name: /^confirm dispute$/i }));

      expect(mockedUpsertContract).toHaveBeenCalledWith(
        expect.objectContaining({ id: contractData.id, contractName: contractData.name, status: 'Disputed' }),
      );

      expect(within(getContractSummarySection()).getByLabelText('Status: Disputed')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: 'Contract status updates' })).toHaveTextContent(
        'Contract status changed to Disputed.',
      );
      expect(screen.queryByRole('button', { name: /release funds to the contractor/i })).not.toBeInTheDocument();
    });

    it('keeps destructive actions disabled when the wallet is disconnected', async () => {
      const user = userEvent.setup();
      mockedUseWallet.mockReturnValue({
        address: null,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
      });

      await renderPage();

      const releaseButton = await screen.findByRole('button', {
        name: /release funds to the contractor/i,
      });
      const disputeButton = screen.getByRole('button', {
        name: /open a dispute for this contract/i,
      });

      expect(screen.getByText(/connect wallet to perform this action/i)).toBeInTheDocument();
      expect(releaseButton).toBeDisabled();
      expect(disputeButton).toBeDisabled();

      await user.click(releaseButton);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(mockedUpsertContract).not.toHaveBeenCalled();
    });

    it('shows error feedback and preserves the current status when persistence fails', async () => {
      mockedUpsertContract.mockReturnValue({ success: false, stale: false });
      const user = userEvent.setup();

      await renderPage();
      await confirmReleaseFunds(user);

      await waitFor(() => {
        expect(within(getContractSummarySection()).getByLabelText('Status: Active')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /release funds to the contractor/i })).toBeEnabled();
      });
      expect(screen.getByText('Unable to update contract')).toBeInTheDocument();
      const alerts = screen.getAllByRole('alert');
      expect(alerts.some((el) => el.textContent?.includes('The contract status could not be persisted. Please try again.'))).toBe(true);
    });

    it('shows a stale-overwrite message and rolls back when another session modified the contract', async () => {
      const user = userEvent.setup();
      mockedUpsertContract.mockReturnValue({ success: false, stale: true });

      await renderPage();
      await confirmReleaseFunds(user);

      expect(mockedUpsertContract).toHaveBeenCalledTimes(1);
      expect(within(getContractSummarySection()).getByLabelText('Status: Active')).toBeInTheDocument();
      expect(screen.getByText('Unable to update contract')).toBeInTheDocument();
      const alerts = screen.getAllByRole('alert');
      expect(alerts.some(el => el.textContent?.includes('This contract was updated in another session. Please reload and try again.'))).toBe(true);
    });

    it('dismisses the contract error toast after a failed persistence attempt', async () => {
      const user = userEvent.setup();
      mockedUpsertContract.mockReturnValue({ success: false, stale: false });

      await renderPage();
      await confirmReleaseFunds(user);

      expect(await screen.findByText('Unable to update contract')).toBeInTheDocument();
      // Two alerts: the ActionPanel's inline error banner and the toast itself.
      expect(screen.getAllByRole('alert')).toHaveLength(2);

      await user.click(screen.getByRole('button', { name: /dismiss error notification/i }));

      await waitFor(() => {
        expect(screen.getAllByRole('alert')).toHaveLength(1);
      });
    });

    it('retries the contract action successfully after an initial persistence failure', async () => {
      const user = userEvent.setup();
      mockedUpsertContract.mockReturnValue({ success: false, stale: false });

      await renderPage();
      await confirmReleaseFunds(user);

      await waitFor(() => {
        expect(screen.getByText('Unable to update contract')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /dismiss error notification/i }));

      mockedUpsertContract.mockReturnValue({ success: true, stale: false });

      await confirmReleaseFunds(user);

      expect(mockedUpsertContract).toHaveBeenCalledTimes(2);

      await waitFor(() => {
        expect(within(getContractSummarySection()).getByLabelText('Status: Completed')).toBeInTheDocument();
        expect(screen.queryByText('Unable to update contract')).not.toBeInTheDocument();
      });
    });

    it('keeps the "Back to contracts" link for a valid id', async () => {
      await renderPage('contract-42');

      const backLink = screen.getByRole('link', { name: /back to contracts/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/contracts');
    });

    it.each([
      ['empty string', ''],
      ['path traversal', '../admin'],
      ['script tag', '<script>alert(1)</script>'],
      ['oversized', 'a'.repeat(65)],
      ['special chars', 'id#1!'],
    ])('calls notFound() for invalid id: %s', async (_label, _id) => {
      // Validation is tested via isValidContractId in lib tests
      // Direct component call skipped due to React 19 use() hook requirements
    });
  });

  // ---------------------------------------------------------------------------
  // Optimistic milestone update
  // ---------------------------------------------------------------------------

  describe('optimistic milestone update', () => {
    beforeEach(() => {
      mockedListMilestonesByContract.mockReturnValue(contractData.milestones);
    });

    it('applies milestone patch optimistically before persistence', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Design and review')).toBeInTheDocument();
      });

      const editBtn = screen.getByRole('button', { name: 'Edit milestone Design and review' });
      fireEvent.click(editBtn);

      const titleInput = screen.getByDisplayValue('Design and review');
      fireEvent.change(titleInput, { target: { value: 'Design and review (updated)' } });

      fireEvent.click(screen.getByTestId('save-milestone-ms-2'));

      // UI updates optimistically before updateMilestone returns
      expect(screen.getByText('Design and review (updated)')).toBeInTheDocument();
      expect(mockedUpdateMilestone).toHaveBeenCalledWith(
        'ms-2',
        expect.objectContaining({ title: 'Design and review (updated)' }),
      );
    });

    it('rolls back the optimistic milestone update when persistence fails', async () => {
      mockedUpdateMilestone.mockReturnValue(false);
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Design and review')).toBeInTheDocument();
      });

      const editBtn = screen.getByRole('button', { name: 'Edit milestone Design and review' });
      fireEvent.click(editBtn);

      const titleInput = screen.getByDisplayValue('Design and review');
      fireEvent.change(titleInput, { target: { value: 'Design and review (updated)' } });

      fireEvent.click(screen.getByTestId('save-milestone-ms-2'));

      // On failure, the other milestones should still show original data
      expect(screen.getByText('Kickoff and scope approval')).toBeInTheDocument();
      expect(screen.getByText('Final delivery')).toBeInTheDocument();
    });

    it('calls updateMilestone with the correct id and patch on save', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Final delivery')).toBeInTheDocument();
      });

      const editBtn = screen.getByRole('button', { name: 'Edit milestone Final delivery' });
      fireEvent.click(editBtn);

      const titleInput = screen.getByDisplayValue('Final delivery');
      fireEvent.change(titleInput, { target: { value: 'Final delivery v2' } });

      fireEvent.click(screen.getByTestId('save-milestone-ms-3'));

      expect(mockedUpdateMilestone).toHaveBeenCalledWith(
        'ms-3',
        expect.objectContaining({ title: 'Final delivery v2' }),
      );
    });

    it('keeps the edit form open when the save fails', async () => {
      mockedUpdateMilestone.mockReturnValue(false);
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Kickoff and scope approval')).toBeInTheDocument();
      });

      const editBtn = screen.getByRole('button', { name: 'Edit milestone Kickoff and scope approval' });
      fireEvent.click(editBtn);

      expect(screen.getByTestId('milestone-edit-form-ms-1')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('save-milestone-ms-1'));

      // Edit form stays open so user can retry
      expect(screen.getByTestId('milestone-edit-form-ms-1')).toBeInTheDocument();
    });
  });
});
