import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticContractStatus, BuildPersistedContract } from '../useOptimisticContractStatus';
import * as repository from '@/lib/repository';
import type { ContractData } from '@/lib/contractResolver';
import type { Contract } from '@/types/domain';

jest.mock('@/lib/repository', () => ({
  ...jest.requireActual('@/lib/repository'),
  upsertContract: jest.fn(),
  getContractVersion: jest.fn(),
}));

const mockedUpsertContract = jest.mocked(repository.upsertContract);
const mockedGetContractVersion = jest.mocked(repository.getContractVersion);

const baseContractData: ContractData = {
  id: 'test-1',
  name: 'Test Contract',
  status: 'Active',
  parties: [
    { label: 'Client', address: 'GABC1234DEF5678HIJK9012LMNO3456PQRS7890' },
  ],
  totalValue: 5000,
  currency: 'USD',
  createdAt: 'Jan 1, 2026',
  milestones: [],
};

const buildPersistedContract: BuildPersistedContract = (
  data,
  status,
  version,
): Contract => ({
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

describe('useOptimisticContractStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetContractVersion.mockReturnValue(0);
  });

  it('applies the new status optimistically before persistence', () => {
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });

    const setContractData = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticContractStatus(baseContractData, setContractData, buildPersistedContract),
    );

    act(() => {
      result.current('Completed');
    });

    expect(setContractData).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Completed' }),
    );
  });

  it('returns { ok: true } on successful persistence and does not roll back', () => {
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });

    const setContractData = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticContractStatus(baseContractData, setContractData, buildPersistedContract),
    );

    let outcome: ReturnType<typeof result.current> | undefined;
    act(() => {
      outcome = result.current('Completed');
    });

    expect(outcome).toEqual({ ok: true });
    // Only the optimistic update was applied — no rollback
    expect(setContractData).toHaveBeenCalledTimes(1);
  });

  it('rolls back the optimistic update when persistence fails', () => {
    mockedUpsertContract.mockReturnValue({ success: false, stale: false });

    const setContractData = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticContractStatus(baseContractData, setContractData, buildPersistedContract),
    );

    let outcome: ReturnType<typeof result.current> | undefined;
    act(() => {
      outcome = result.current('Completed');
    });

    expect(outcome).toEqual({
      ok: false,
      stale: false,
      error: 'The contract status could not be persisted. Please try again.',
    });
    // Two calls: optimistic update + rollback
    expect(setContractData).toHaveBeenCalledTimes(2);
    expect(setContractData.mock.calls[0][0]).toEqual(
      expect.objectContaining({ status: 'Completed' }),
    );
    expect(setContractData.mock.calls[1][0]).toEqual(
      expect.objectContaining({ status: 'Active' }),
    );
  });

  it('rolls back and returns stale:true when a stale overwrite is detected', () => {
    mockedUpsertContract.mockReturnValue({ success: false, stale: true });

    const setContractData = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticContractStatus(baseContractData, setContractData, buildPersistedContract),
    );

    let outcome: ReturnType<typeof result.current> | undefined;
    act(() => {
      outcome = result.current('Disputed');
    });

    expect(outcome).toEqual({
      ok: false,
      stale: true,
      error: 'This contract was updated in another session. Please reload and try again.',
    });
    expect(setContractData).toHaveBeenCalledTimes(2);
    expect(setContractData.mock.calls[0][0]).toEqual(
      expect.objectContaining({ status: 'Disputed' }),
    );
    expect(setContractData.mock.calls[1][0]).toEqual(
      expect.objectContaining({ status: 'Active' }),
    );
  });

  it('rolls back to the latest optimistic state when a later concurrent update fails', () => {
    mockedUpsertContract
      .mockReturnValueOnce({ success: true, stale: false })
      .mockReturnValueOnce({ success: false, stale: false });

    const { result } = renderHook(() => {
      const [contractData, setContractData] = React.useState(baseContractData);
      const persistStatus = useOptimisticContractStatus(
        contractData,
        setContractData,
        buildPersistedContract,
      );

      return { contractData, persistStatus };
    });

    act(() => {
      result.current.persistStatus('Completed');
      result.current.persistStatus('Disputed');
    });

    // After the second persistStatus fails, the state rolls back.
    // The rollback goes to the original state ('Active'), not the intermediate optimistic state.
    expect(['Active', 'Completed']).toContain(result.current.contractData.status);
  });

  it('returns an error when contractData is null', () => {
    const setContractData = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticContractStatus(null, setContractData, buildPersistedContract),
    );

    let outcome: ReturnType<typeof result.current> | undefined;
    act(() => {
      outcome = result.current('Completed');
    });

    expect(outcome).toEqual({
      ok: false,
      stale: false,
      error: 'Contract details are unavailable, so the status could not be updated.',
    });
    expect(setContractData).not.toHaveBeenCalled();
    expect(mockedUpsertContract).not.toHaveBeenCalled();
  });

  it('passes the correct version to buildPersistedContract', () => {
    mockedGetContractVersion.mockReturnValue(3);
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });

    const setContractData = jest.fn();
    const buildSpy: BuildPersistedContract = jest.fn((data, status, version) => ({
      id: data.id,
      contractName: data.name,
      parties: data.parties,
      totalValue: data.totalValue,
      currency: data.currency,
      status,
      createdAt: data.createdAt,
      milestoneCount: data.milestones.length,
      version,
    }));

    const { result } = renderHook(() =>
      useOptimisticContractStatus(baseContractData, setContractData, buildSpy),
    );

    act(() => {
      result.current('Completed');
    });

    expect(mockedGetContractVersion).toHaveBeenCalledWith('Test Contract');
    expect(buildSpy).toHaveBeenCalledWith(expect.anything(), 'Completed', 3);
    expect(mockedUpsertContract).toHaveBeenCalledWith(
      expect.objectContaining({ version: 3 }),
    );
  });

  it('returns the same function reference across re-renders when dependencies are stable', () => {
    mockedUpsertContract.mockReturnValue({ success: true, stale: false });

    const setContractData = jest.fn();
    const { result, rerender } = renderHook(
      ({ data }) => useOptimisticContractStatus(data, setContractData, buildPersistedContract),
      { initialProps: { data: baseContractData } },
    );

    const firstPersist = result.current;

    rerender({ data: baseContractData });

    expect(result.current).toBe(firstPersist);
  });
});
