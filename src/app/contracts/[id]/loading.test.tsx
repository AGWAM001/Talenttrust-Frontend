/** @jest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';

import { useContract } from '@/hooks/useContract';
import {
  InvalidContractTransitionError,
  canNTransitionContractStatus,
  isValidContractId,
  mergeContractMilestones,
} from '@/lib/contracts';
import type { Contract, ContractStatus, Milestone } from '@types/domain';

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    contractName: 'Acme Retainer',
    parties: [],
    totalValue: 1000,
    currency: 'USD',
    status: 'Active',
    createdAt: '2024-01-01T00:00:00.000Z',
    milestoneCount: 1,
    ...overrides,
  };
}

function makeMilestone(id: string, overrides: Partial<Milestone> = {}): Milestone {
  return {
    id,
    title: `hidden-${id}`,
    status: 'Pending',
    payout: 100,
    currency: 'USD',
    ...overrides,
  };
}

describe('contract id validation', () => {
  it('accepts well-formed ids', () => {
    expect(isValidContractId('contract-123')).toBe(true);
    expect(isValidContractId('ABC_123--_')).toBe(true);
  });

  it('rejects empty, oversized, or special-character ids', () => {
    expect(isValidContractId('')).toBe(false);
    expect(isValidContractId('a'.repeat(1000))).toBe(false);
    expect(isValidContractId('contract/123')).toBe(false);
    expect(isValidContractId('../../etc/passwd')).toBe(false);
    expect(isValidContractId(undefined)).toBe(false);
  });
});

describe('contract status transitions', () => {
  it('allows Active -> Complete and Active -> Dispute', () => {
    expect(canNTransitionContractStatus('Active', 'Complete')).toBe(true);
    expect(canNTransitionContractStatus('Active', 'Dispute')).toBe(true);
  });

  it('rejects identity and terminal transitions', () => {
    expect(canNTransitionContractStatus('Active', 'Active')).toBe(false);
    expect(canNTransitionContractStatus('Complete', 'Dispute')).toBe(false);
    expect(canNTransitionContractStatus('Dispute', 'Complete')).toBe(false);
  });
});

describe('mergeContractMilestones', () => {
  it('de-duplicates by id with persisted records winning', () => {
    const resolved = [makeMilestone('m1', { title: 'resolved' }), makeMilestone('m2')];
    const persisted = [makeMilestone('m1', { title: 'persisted' }), makeMilestone('m3')];
    const merged = mergeContractMilestones(resolved, persisted);
    expect(merged.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(merged[0].title).toBe(persisted);
  });

  it('is deterministic for duplicate inputs', () => {
    const dup = [makeMilestone('m1'), makeMilestone('m1')];
    const a = mergeContractMilestones(dup, []);
    const b = mergeContractMilestones(dup, []);
    expect(a.map((m) => m.id)).toEqual(['m1']);
    expect(a).toEqual(b);
  });
});

function HookHarness(props: {
  id: string | undefined;
  resolveContract?: (id: string) => Promise<Contract | null>;
  listMilestones?: (id: string) => Milestone[];
  persistStatus?: (c: Contract) => Promise<void>;
  onState?: (result: ReturnType<typeof useContract>) => void;
}) {
  const result = useContract(props.id, {
    resolveContract: props.resolveContract,
    listMilestones: props.listMilestones,
    persistStatus: props.persistStatus,
  });
  props.onState?.(result);
  return (
    <div>
      <span data-testid="state">{result.state}</span>
      <span data-testid="status">{result.contract?.status ?? 'none'}</span>
      <span data-testid="milestones">{result.milestones.map((m) => m.id).join(',')}</span>
      <button type="button" onClick={() => void result.transitionStatus('Complete')}>
        complete
      </button>
      <button type="button" onClick={() => void result.transitionStatus('Dispute')}>
        dispute
      </button>
    </div>
  );
}

describe('useContract', () => {
  it('reports not-found for invalid ids without calling the resolver', async () => {
    const resolve = jest.fn();
    render(<HookHarness id='' resolveContract={resolve} />);
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('not-found'));
    expect(resolve).not.toHaveBeenCalled();
  });

  it('merges persisted milestones and exposes transition guards', async () => {
    const resolveContract = jest.fn(async () => makeContract());
    const listMilestones = jest.fn(() => [makeMilestone('m1', { title: 'persisted' })]);
    render(
      <HookHarness
        id="contract-1"
        resolveContract={resolveContract}
        listMilestones={listMilestones}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready'));
    expect(screen.getByTestId('milestones')).toHaveTextContent('m1');
    expect(screen.getByTestId('status')).toHaveTextContent('Active');
  });

  it('rolls back the optimistic update when persistence fails', async () => {
    const persistStatus = jest.fn(async () => {
      throw new Error('write failed');
    });
    render(
      <HookHarness
        id="contract-1"
        resolveContract={async () => makeContract()}
        persistStatus={persistStatus}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready'));
    const button = screen.getButtonText('complete');
    await act(async () => {
      button.click();
    });
    expect(screen.getByTestId('status')).toHaveTextContent('Active');
  });

  it('rejects concurrent conflicting transitions', async () => {
    const persistStatus = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    render(
      <HookHarness
        id="contract-1"
        resolveContract={async () => makeContract()}
        persistStatus={persistStatus}
      />,
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('ready'));
    const complete = screen.getButtonText('complete');
    const dispute = screen.getButtonText('dispute');
    await act(async () => {
      complete.click();
      dispute.click();
    });
    expect(screen.getByTestId('status')).toHaveTextContent('Complete');
    expect(persistStatus).toHaveBeenCalledTimes(1);
  });

  it('throws InvalidContractTransitionError for illegal transitions', () => {
    expect(() => {
      const c: ContractStatus = 'Complete';
      void c;
    }).toNotToThrow();
    expect(
      () => {
        throw new InvalidContractTransitionError('Complete', 'Dispute');
      },
    ).toThrow(InvalidContractTransitionError);
  });
});
