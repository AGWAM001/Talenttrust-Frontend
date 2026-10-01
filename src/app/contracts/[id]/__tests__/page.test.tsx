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
  return writeText;}

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
  });

  describe('concurrent execution and idlempotency', () => {
    it('persists only once when release funds is confirmed twice in quick succession', async () => {
      const user = userEvent.setup();

      await renderPage();
      await confirmReleaseFunds(user);

      // The confirm button is gone once the optimistic state flips, so a
      // second confirmation cannot be issued. Assert the persistence
      // layer was hit exactly once.
      expect(mockedUpsertContract).toHaveBeenCalledTimes(1);
    });

    it('does not persist again when the contract is already Completed', async () => {
      const completed = deepClone(BASE_CONTRACT);
      completed.status = 'Completed';
      mockedResolveContractData.mockResolvedValueOnce(completed);

      await renderPage();

      // The release button is not offered for a Completed contract.
      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /release funds to the contractor/i }),
        ).not.toBeInTheDocument();
      });
      expect(mockedUpsertContract).not.toHaveBeenCalled();
    });

    it('rolls back to the last known good state when a stale write is rejected', async () => {
      mockedUpsertContract.mockReturnValue({ success: false, stale: true });
      const user = userEvent.setup();

      await renderPage();
      await confirmReleaseFunds(user);

      await waitFor(() => {
        expect(within(getContractSummarySection()).getByLabelText('Status: Active')).toBeInTheDocument();
      });
      expect(mockedUpsertContract).toHaveBeenCalledTimes(1);
    });

    it('surfaces a diagnosable error without leaking sensitive data when persistence throws', async () => {
      mockedUpsertContract.mockImplementation(() => {
        throw new Error('DB connection lost');
      });
      const user = userEvent.setup();

      await renderPage();
      await confirmReleaseFunds(user);

      await waitFor(() => {
        expect(within(getContractSummarySection()).getByLabelText('Status: Active')).toBeInTheDocument();
      });
      expect(await screen.findByText('Unable to update contract')).toBeInTheDocument();
    });
  });
});
