/**
 * Compile-and-run verification for the examples in docs/hooks/ContractsHooks.md.
 *
 * Behaviour is owned by useContractProgress.test.ts and
 * useOptimisticContractStatus.test.ts. The purpose here is narrower and
 * complementary: every snippet published in the reference page is reproduced
 * verbatim (imports, prop names, destructured fields, result branches) and
 * executed. If a hook signature, a returned field, or a result shape changes,
 * TypeScript or these assertions fail before a reviewer ever sees a stale doc.
 *
 * Each describe block maps to a named example in ContractsHooks.md.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { render, renderHook, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import {
  useContractProgress,
  calculateContractProgress,
  type ContractProgressMetrics,
} from '../useContractProgress';
import {
  useOptimisticContractStatus,
  type BuildPersistedContract,
  type PersistResult,
} from '../useOptimisticContractStatus';
import * as repository from '@/lib/repository';
import type { Milestone } from '@/components/MilestonesList';
import type { ContractData } from '@/lib/contractResolver';

jest.mock('@/lib/repository', () => ({
  ...jest.requireActual('@/lib/repository'),
  upsertContract: jest.fn(),
  getContractVersion: jest.fn(),
}));

const mockedUpsertContract = jest.mocked(repository.upsertContract);
const mockedGetContractVersion = jest.mocked(repository.getContractVersion);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMilestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: 'ms-1',
    title: 'Milestone',
    status: 'Pending',
    payout: 1000,
    currency: 'USD',
    ...overrides,
  };
}

const baseContractData: ContractData = {
  id: 'contract-1',
  name: 'Docs Example Contract',
  status: 'Active',
  parties: [{ label: 'Client', address: 'GABC1234DEF5678HIJK9012LMNO3456PQRS7890' }],
  totalValue: 4000,
  currency: 'USD',
  createdAt: 'Jan 1, 2026',
  milestones: [],
};

/** The exact `buildPersistedContract` mapper published in the doc. */
const buildPersistedContract: BuildPersistedContract = (data, status, version) => ({
  id: data.id,
  contractName: data.name,
  parties: data.parties,
  totalValue: data.totalValue,
  currency: data.currency,
  status,
  createdAt: data.createdAt,
  milestoneCount: data.milestones.length,
  version,
});

// ---------------------------------------------------------------------------
// 1. useContractProgress — "Render an escrow panel" example
// ---------------------------------------------------------------------------

/** Reproduces the EscrowPanel snippet, minus the usePreferences formatting. */
function EscrowPanel({ milestones }: { milestones: Milestone[] }) {
  const {
    completedCount,
    totalCount,
    paidAmount,
    outstandingAmount,
    progressPercent,
    currency,
  } = useContractProgress(milestones);

  if (totalCount === 0) {
    return <p>No milestones yet</p>;
  }

  return (
    <section aria-labelledby="escrow-title">
      <h2 id="escrow-title">Escrow Progress</h2>
      <p>
        {completedCount} / {totalCount} milestones complete
      </p>
      <div
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      />
      <dl>
        <dt>Paid</dt>
        <dd>
          {paidAmount} {currency}
        </dd>
        <dt>Outstanding</dt>
        <dd>
          {outstandingAmount} {currency}
        </dd>
      </dl>
    </section>
  );
}

describe('docs/hooks/ContractsHooks.md — useContractProgress escrow panel example', () => {
  it('renders the in-progress state with the documented metric values', () => {
    render(
      <EscrowPanel
        milestones={[
          makeMilestone({ id: 'ms-1', status: 'Completed', payout: 1500 }),
          makeMilestone({ id: 'ms-2', status: 'Pending', payout: 2500 }),
          makeMilestone({ id: 'ms-3', status: 'Pending', payout: 3000 }),
        ]}
      />,
    );

    expect(screen.getByText('1 / 3 milestones complete')).toBeInTheDocument();
    // 1 of 3 rounds to 33, exactly as the States table claims.
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
    expect(screen.getByText('1500 USD')).toBeInTheDocument();
    expect(screen.getByText('5500 USD')).toBeInTheDocument();
  });

  it('renders the documented empty state instead of a 0-of-0 progress bar', () => {
    render(<EscrowPanel milestones={[]} />);

    expect(screen.getByText('No milestones yet')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders the complete state at 100 percent with nothing outstanding', () => {
    render(
      <EscrowPanel
        milestones={[
          makeMilestone({ id: 'ms-1', status: 'Completed', payout: 1000 }),
          makeMilestone({ id: 'ms-2', status: 'Paid', payout: 2000 }),
        ]}
      />,
    );

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('3000 USD')).toBeInTheDocument();
    expect(screen.getByText('0 USD')).toBeInTheDocument();
  });

  it('renders the not-started state with everything outstanding', () => {
    render(
      <EscrowPanel
        milestones={[
          makeMilestone({ id: 'ms-1', status: 'Pending', payout: 1200 }),
          makeMilestone({ id: 'ms-2', status: 'Active', payout: 800 }),
        ]}
      />,
    );

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0 USD')).toBeInTheDocument();
    expect(screen.getByText('2000 USD')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. useContractProgress — "A compact list summary" example
// ---------------------------------------------------------------------------

function ContractProgressPill({ milestones }: { milestones: Milestone[] }) {
  const { progressPercent, completedCount, totalCount } = useContractProgress(milestones);

  return (
    <span aria-label={`${completedCount} of ${totalCount} milestones complete`}>
      {progressPercent}%
    </span>
  );
}

describe('docs/hooks/ContractsHooks.md — useContractProgress list summary example', () => {
  it('renders the rounded percentage with an accessible label', () => {
    render(
      <ContractProgressPill
        milestones={[
          makeMilestone({ id: 'ms-1', status: 'Paid' }),
          makeMilestone({ id: 'ms-2', status: 'Pending' }),
        ]}
      />,
    );

    expect(screen.getByLabelText('1 of 2 milestones complete')).toHaveTextContent('50%');
  });

  it('renders 0% for the empty state without dividing by zero', () => {
    render(<ContractProgressPill milestones={[]} />);

    expect(screen.getByLabelText('0 of 0 milestones complete')).toHaveTextContent('0%');
  });
});

// ---------------------------------------------------------------------------
// 3. useContractProgress — documented states, returns, and edge cases
// ---------------------------------------------------------------------------

describe('docs/hooks/ContractsHooks.md — useContractProgress States table', () => {
  it('matches the documented Empty row exactly', () => {
    const { result } = renderHook(() => useContractProgress([]));

    expect(result.current).toEqual<ContractProgressMetrics>({
      completedCount: 0,
      totalCount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      progressPercent: 0,
      currency: 'USD',
    });
  });

  it('tolerates a nullish array, as the Inputs table claims', () => {
    // The doc states a nullish value is tolerated; the source guards with
    // `!milestones`. Cast because the public type does not allow it.
    const { result } = renderHook(() =>
      useContractProgress(undefined as unknown as Milestone[]),
    );

    expect(result.current.totalCount).toBe(0);
    expect(result.current.currency).toBe('USD');
  });

  it('counts a Disputed milestone as outstanding, per the Gotchas section', () => {
    const { result } = renderHook(() =>
      useContractProgress([
        makeMilestone({ id: 'ms-1', status: 'Disputed', payout: 900 }),
        makeMilestone({ id: 'ms-2', status: 'Paid', payout: 100 }),
      ]),
    );

    expect(result.current.completedCount).toBe(1);
    expect(result.current.paidAmount).toBe(100);
    expect(result.current.outstandingAmount).toBe(900);
  });

  it('takes currency from the first milestone only, per the Gotchas section', () => {
    const { result } = renderHook(() =>
      useContractProgress([
        makeMilestone({ id: 'ms-1', currency: 'NGN' }),
        makeMilestone({ id: 'ms-2', currency: 'USD' }),
      ]),
    );

    expect(result.current.currency).toBe('NGN');
  });

  it('reports count-based progress even when most value is outstanding', () => {
    // The Gotchas section calls this out explicitly: 50% complete by count
    // while the bulk of the money is unpaid.
    const { result } = renderHook(() =>
      useContractProgress([
        makeMilestone({ id: 'ms-1', status: 'Paid', payout: 1 }),
        makeMilestone({ id: 'ms-2', status: 'Pending', payout: 9999 }),
      ]),
    );

    expect(result.current.progressPercent).toBe(50);
    expect(result.current.outstandingAmount).toBe(9999);
  });
});

// ---------------------------------------------------------------------------
// 4. useContractProgress — memoization contract example
// ---------------------------------------------------------------------------

describe('docs/hooks/ContractsHooks.md — memoization contract', () => {
  it('returns a stable object identity while the array reference is stable', () => {
    const milestones = [makeMilestone({ status: 'Completed' })];

    const { result, rerender } = renderHook(({ data }) => useContractProgress(data), {
      initialProps: { data: milestones },
    });

    const first = result.current;
    rerender({ data: milestones });

    expect(result.current).toBe(first);
  });

  it('recomputes when a new array reference is supplied', () => {
    const { result, rerender } = renderHook(({ data }) => useContractProgress(data), {
      initialProps: { data: [makeMilestone({ status: 'Pending', payout: 100 })] },
    });

    const first = result.current;
    rerender({ data: [makeMilestone({ status: 'Completed', payout: 100 })] });

    expect(result.current).not.toBe(first);
    expect(result.current.paidAmount).toBe(100);
  });

  it('shows the documented anti-pattern: an inline filter defeats memoization', () => {
    const milestones = [
      makeMilestone({ id: 'ms-1', status: 'Disputed' }),
      makeMilestone({ id: 'ms-2', status: 'Paid' }),
    ];

    // ❌ new array identity on every render
    const { result, rerender } = renderHook(() =>
      useContractProgress(milestones.filter((m) => m.status !== 'Disputed')),
    );

    const first = result.current;
    rerender();

    expect(result.current).not.toBe(first);
    expect(result.current).toEqual(first); // same values, new identity
  });

  it('shows the documented fix: memoize the filtered array upstream', () => {
    const milestones = [
      makeMilestone({ id: 'ms-1', status: 'Disputed' }),
      makeMilestone({ id: 'ms-2', status: 'Paid' }),
    ];

    // ✅ stable identity while inputs are unchanged
    const { result, rerender } = renderHook(() => {
      const visible = useMemo(
        () => milestones.filter((m) => m.status !== 'Disputed'),
        [],
      );
      return useContractProgress(visible);
    });

    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
  });
});

// ---------------------------------------------------------------------------
// 5. calculateContractProgress — non-React entry point example
// ---------------------------------------------------------------------------

describe('docs/hooks/ContractsHooks.md — calculateContractProgress example', () => {
  it('sorts contracts by progressPercent outside of React, as documented', () => {
    const contractMilestoneGroups = [
      {
        id: 'c-slow',
        milestones: [
          makeMilestone({ id: 'a', status: 'Pending' }),
          makeMilestone({ id: 'b', status: 'Pending' }),
        ],
      },
      {
        id: 'c-done',
        milestones: [makeMilestone({ id: 'c', status: 'Paid' })],
      },
      {
        id: 'c-half',
        milestones: [
          makeMilestone({ id: 'd', status: 'Completed' }),
          makeMilestone({ id: 'e', status: 'Pending' }),
        ],
      },
    ];

    const byProgress = [...contractMilestoneGroups].sort(
      (a, b) =>
        calculateContractProgress(b.milestones).progressPercent -
        calculateContractProgress(a.milestones).progressPercent,
    );

    expect(byProgress.map((group) => group.id)).toEqual(['c-done', 'c-half', 'c-slow']);
  });

  it('returns the same result as the hook for identical input', () => {
    const milestones = [
      makeMilestone({ id: 'ms-1', status: 'Paid', payout: 750 }),
      makeMilestone({ id: 'ms-2', status: 'Pending', payout: 250 }),
    ];

    const { result } = renderHook(() => useContractProgress(milestones));

    expect(result.current).toEqual(calculateContractProgress(milestones));
  });

  it('destructures paidAmount and outstandingAmount as shown', () => {
    const { paidAmount, outstandingAmount } = calculateContractProgress([
      makeMilestone({ id: 'ms-1', status: 'Completed', payout: 400 }),
      makeMilestone({ id: 'ms-2', status: 'Pending', payout: 600 }),
    ]);

    expect(paidAmount).toBe(400);
    expect(outstandingAmount).toBe(600);
  });
});

// ---------------------------------------------------------------------------
// 6. useOptimisticContractStatus — "Wiring the detail page actions" example
// ---------------------------------------------------------------------------

/**
 * Reproduces the ContractActions snippet. The toast calls are replaced with
 * injected spies so the example can run without a ToastProvider, but the
 * control flow — including reading `result.ok` before showing feedback — is
 * identical to the published code.
 */
function ContractActions({
  initialContract,
  onError,
  onSuccess,
}: {
  initialContract: ContractData | null;
  onError: (input: { title: string; description: string }) => void;
  onSuccess: (input: { title: string; description: string }) => void;
}) {
  const [contractData, setContractData] = useState<ContractData | null>(initialContract);
  const [isPersisting, setIsPersisting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mapper: BuildPersistedContract = useCallback(
    (data, status, version) => ({
      id: data.id,
      contractName: data.name,
      parties: data.parties,
      totalValue: data.totalValue,
      currency: data.currency,
      status,
      createdAt: data.createdAt,
      milestoneCount: data.milestones.length,
      version,
    }),
    [],
  );

  const persistStatus = useOptimisticContractStatus(contractData, setContractData, mapper);

  const releaseFunds = useCallback(() => {
    setIsPersisting(true);
    setErrorMessage(null);

    const result = persistStatus('Completed');

    if (!result.ok) {
      setErrorMessage(result.error);
      onError({ title: 'Unable to update contract', description: result.error });
      setIsPersisting(false);
      return;
    }

    onSuccess({
      title: 'Funds released',
      description: 'The contract was marked as Completed and the change was saved.',
    });
    setIsPersisting(false);
  }, [persistStatus, onError, onSuccess]);

  return (
    <>
      <p data-testid="status">{contractData?.status ?? 'unknown'}</p>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <button type="button" onClick={releaseFunds} disabled={isPersisting}>
        Release funds
      </button>
    </>
  );
}

describe('docs/hooks/ContractsHooks.md — ContractActions example', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetContractVersion.mockReturnValue(0);
  });

  it('applies the status optimistically and keeps it on a successful write', async () => {
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });
    const onError = jest.fn();
    const onSuccess = jest.fn();

    render(
      <ContractActions
        initialContract={baseContractData}
        onError={onError}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('Active');

    await userEvent.click(screen.getByRole('button', { name: 'Release funds' }));

    expect(screen.getByTestId('status')).toHaveTextContent('Completed');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledWith({
      title: 'Funds released',
      description: 'The contract was marked as Completed and the change was saved.',
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('rolls the UI back and surfaces the documented copy on a failed write', async () => {
    mockedUpsertContract.mockReturnValue({ success: false, stale: false });
    const onError = jest.fn();
    const onSuccess = jest.fn();

    render(
      <ContractActions
        initialContract={baseContractData}
        onError={onError}
        onSuccess={onSuccess}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Release funds' }));

    // Rolled back by the hook — the caller never restores state itself.
    expect(screen.getByTestId('status')).toHaveTextContent('Active');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The contract status could not be persisted. Please try again.',
    );
    expect(onError).toHaveBeenCalledWith({
      title: 'Unable to update contract',
      description: 'The contract status could not be persisted. Please try again.',
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('rolls back and reports the stale message when another session won', async () => {
    mockedUpsertContract.mockReturnValue({ success: false, stale: true });
    const onError = jest.fn();

    render(
      <ContractActions
        initialContract={baseContractData}
        onError={onError}
        onSuccess={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Release funds' }));

    expect(screen.getByTestId('status')).toHaveTextContent('Active');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This contract was updated in another session. Please reload and try again.',
    );
  });

  it('reports the unavailable state when contractData is still null', async () => {
    const onError = jest.fn();

    render(
      <ContractActions initialContract={null} onError={onError} onSuccess={jest.fn()} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Release funds' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Contract details are unavailable, so the status could not be updated.',
    );
    expect(mockedUpsertContract).not.toHaveBeenCalled();
  });

  it('re-enables the button after a failure so the action can be retried', async () => {
    mockedUpsertContract.mockReturnValue({ success: false, stale: false });

    render(
      <ContractActions
        initialContract={baseContractData}
        onError={jest.fn()}
        onSuccess={jest.fn()}
      />,
    );

    const button = screen.getByRole('button', { name: 'Release funds' });
    await userEvent.click(button);

    expect(button).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// 7. useOptimisticContractStatus — "Branching on stale" example
// ---------------------------------------------------------------------------

describe('docs/hooks/ContractsHooks.md — branching on stale example', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetContractVersion.mockReturnValue(0);
  });

  function runStaleBranch(result: PersistResult) {
    const showError = jest.fn();
    const reload = jest.fn();

    if (!result.ok) {
      if (result.stale) {
        showError({
          title: 'Contract changed elsewhere',
          description: result.error,
          action: { label: 'Reload', onClick: reload },
        });
      } else {
        showError({ title: 'Unable to update contract', description: result.error });
      }
    }

    return { showError, reload };
  }

  it('offers a Reload action when the failure is stale', () => {
    mockedUpsertContract.mockReturnValue({ success: false, stale: true });

    const { result } = renderHook(() =>
      useOptimisticContractStatus(baseContractData, jest.fn(), buildPersistedContract),
    );

    let outcome!: PersistResult;
    act(() => {
      outcome = result.current('Disputed');
    });

    const { showError } = runStaleBranch(outcome);

    expect(showError).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Contract changed elsewhere',
        action: expect.objectContaining({ label: 'Reload' }),
      }),
    );
  });

  it('offers the plain retry copy when the failure is not stale', () => {
    mockedUpsertContract.mockReturnValue({ success: false, stale: false });

    const { result } = renderHook(() =>
      useOptimisticContractStatus(baseContractData, jest.fn(), buildPersistedContract),
    );

    let outcome!: PersistResult;
    act(() => {
      outcome = result.current('Disputed');
    });

    const { showError } = runStaleBranch(outcome);

    expect(showError).toHaveBeenCalledWith({
      title: 'Unable to update contract',
      description: 'The contract status could not be persisted. Please try again.',
    });
  });
});

// ---------------------------------------------------------------------------
// 8. useOptimisticContractStatus — documented States table and Gotchas
// ---------------------------------------------------------------------------

describe('docs/hooks/ContractsHooks.md — useOptimisticContractStatus States table', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetContractVersion.mockReturnValue(0);
  });

  it('calls setContractData exactly once on success', () => {
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });
    const setContractData = jest.fn();

    const { result } = renderHook(() =>
      useOptimisticContractStatus(
        baseContractData,
        setContractData,
        buildPersistedContract,
      ),
    );

    act(() => {
      expect(result.current('Completed')).toEqual({ ok: true });
    });

    expect(setContractData).toHaveBeenCalledTimes(1);
  });

  it('calls setContractData exactly twice on failure — optimistic then rollback', () => {
    mockedUpsertContract.mockReturnValue({ success: false, stale: false });
    const setContractData = jest.fn();

    const { result } = renderHook(() =>
      useOptimisticContractStatus(
        baseContractData,
        setContractData,
        buildPersistedContract,
      ),
    );

    act(() => {
      result.current('Completed');
    });

    expect(setContractData).toHaveBeenCalledTimes(2);
    expect(setContractData.mock.calls[0][0]).toEqual(
      expect.objectContaining({ status: 'Completed' }),
    );
    expect(setContractData.mock.calls[1][0]).toEqual(
      expect.objectContaining({ status: 'Active' }),
    );
  });

  it('never touches state or the repository when contractData is null', () => {
    const setContractData = jest.fn();

    const { result } = renderHook(() =>
      useOptimisticContractStatus(null, setContractData, buildPersistedContract),
    );

    act(() => {
      expect(result.current('Completed')).toEqual({
        ok: false,
        stale: false,
        error: 'Contract details are unavailable, so the status could not be updated.',
      });
    });

    expect(setContractData).not.toHaveBeenCalled();
    expect(mockedUpsertContract).not.toHaveBeenCalled();
    expect(mockedGetContractVersion).not.toHaveBeenCalled();
  });

  it('returns synchronously — the result is not a promise', () => {
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });

    const { result } = renderHook(() =>
      useOptimisticContractStatus(baseContractData, jest.fn(), buildPersistedContract),
    );

    let outcome!: PersistResult;
    act(() => {
      outcome = result.current('Completed');
    });

    expect(outcome).not.toBeInstanceOf(Promise);
    expect(outcome).toEqual({ ok: true });
  });
});

describe('docs/hooks/ContractsHooks.md — useOptimisticContractStatus Gotchas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetContractVersion.mockReturnValue(0);
  });

  it('looks the version up by contract NAME, not id, as documented', () => {
    mockedGetContractVersion.mockReturnValue(7);
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });

    const { result } = renderHook(() =>
      useOptimisticContractStatus(baseContractData, jest.fn(), buildPersistedContract),
    );

    act(() => {
      result.current('Completed');
    });

    expect(mockedGetContractVersion).toHaveBeenCalledWith('Docs Example Contract');
    expect(mockedGetContractVersion).not.toHaveBeenCalledWith('contract-1');
  });

  it('threads the version verbatim into the persisted contract', () => {
    mockedGetContractVersion.mockReturnValue(3);
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });

    const mapper = jest.fn(buildPersistedContract);

    const { result } = renderHook(() =>
      useOptimisticContractStatus(baseContractData, jest.fn(), mapper),
    );

    act(() => {
      result.current('Completed');
    });

    expect(mapper).toHaveBeenCalledWith(expect.anything(), 'Completed', 3);
    expect(mockedUpsertContract).toHaveBeenCalledWith(
      expect.objectContaining({ version: 3, contractName: 'Docs Example Contract' }),
    );
  });

  it('passes the PRE-transition data plus the next status to the mapper', () => {
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });
    const mapper = jest.fn(buildPersistedContract);

    const { result } = renderHook(() =>
      useOptimisticContractStatus(baseContractData, jest.fn(), mapper),
    );

    act(() => {
      result.current('Disputed');
    });

    // `data.status` is still the old value; the doc tells callers to use the
    // `status` argument instead.
    expect(mapper.mock.calls[0][0].status).toBe('Active');
    expect(mapper.mock.calls[0][1]).toBe('Disputed');
    expect(mockedUpsertContract).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Disputed' }),
    );
  });

  it('keeps persistStatus identity stable while contractData is unchanged', () => {
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });
    const setContractData = jest.fn();

    const { result, rerender } = renderHook(
      ({ data }) =>
        useOptimisticContractStatus(data, setContractData, buildPersistedContract),
      { initialProps: { data: baseContractData } },
    );

    const first = result.current;
    rerender({ data: baseContractData });

    expect(result.current).toBe(first);
  });

  it('changes persistStatus identity when contractData changes, per the Gotchas', () => {
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });
    const setContractData = jest.fn();

    const { result, rerender } = renderHook(
      ({ data }) =>
        useOptimisticContractStatus(data, setContractData, buildPersistedContract),
      { initialProps: { data: baseContractData } },
    );

    const first = result.current;
    rerender({ data: { ...baseContractData, status: 'Pending' } });

    expect(result.current).not.toBe(first);
  });

  it('rolls back to the snapshot taken at call time', () => {
    mockedUpsertContract.mockReturnValue({ success: false, stale: true });
    const pendingContract: ContractData = { ...baseContractData, status: 'Pending' };
    const setContractData = jest.fn();

    const { result } = renderHook(() =>
      useOptimisticContractStatus(
        pendingContract,
        setContractData,
        buildPersistedContract,
      ),
    );

    act(() => {
      result.current('Completed');
    });

    expect(setContractData.mock.calls[1][0]).toEqual(
      expect.objectContaining({ status: 'Pending' }),
    );
  });

  it('does not throw on failure — callers must read the result', () => {
    mockedUpsertContract.mockReturnValue({ success: false, stale: false });

    const { result } = renderHook(() =>
      useOptimisticContractStatus(baseContractData, jest.fn(), buildPersistedContract),
    );

    expect(() => {
      act(() => {
        result.current('Completed');
      });
    }).not.toThrow();
  });
});
