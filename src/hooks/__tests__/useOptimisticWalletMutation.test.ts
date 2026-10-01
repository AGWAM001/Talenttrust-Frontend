import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticWalletMutation } from '../useOptimisticWalletMutation';
import * as repository from '@/lib/repository';
import type { WalletItem } from '@/types/domain';

jest.mock('@/lib/repository', () => ({
  ...jest.requireActual('@/lib/repository'),
  saveWalletItem: jest.fn(),
  updateWalletItem: jest.fn(),
  deleteWalletItems: jest.fn(),
  getWalletItemVersion: jest.fn(),
  upsertWalletItem: jest.fn(),
}));

const mockedSaveWalletItem = jest.mocked(repository.saveWalletItem);
const mockedUpdateWalletItem = jest.mocked(repository.updateWalletItem);
const mockedDeleteWalletItems = jest.mocked(repository.deleteWalletItems);
const mockedGetWalletItemVersion = jest.mocked(repository.getWalletItemVersion);
const mockedUpsertWalletItem = jest.mocked(repository.upsertWalletItem);

const baseWalletItems: WalletItem[] = [
  {
    id: 'w-1',
    name: 'Stellar Lumens (XLM)',
    type: 'Native Asset',
    balance: 12500,
    currency: 'XLM',
    status: 'Active',
    createdAt: '2026-01-15',
    version: 1,
  },
  {
    id: 'w-2',
    name: 'USD Coin (USDC)',
    type: 'Stablecoin',
    balance: 3400,
    currency: 'USDC',
    status: 'Active',
    createdAt: '2026-02-01',
    version: 1,
  },
];

describe('useOptimisticWalletMutation — optimisticCreate', () => {
  const newItem: WalletItem = {
    id: 'w-3',
    name: 'New Custom Token',
    type: 'Asset',
    balance: 500,
    currency: 'NCT',
    status: 'Pending',
    createdAt: '2026-03-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSaveWalletItem.mockReturnValue(true);
  });

  it('applies the new wallet item optimistically before persistence', () => {
    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    let outcome: ReturnType<typeof result.current.optimisticCreate> | undefined;
    act(() => {
      outcome = result.current.optimisticCreate(newItem);
    });

    expect(outcome).toEqual({ ok: true });
    expect(setItems).toHaveBeenCalledWith(expect.any(Function));
    expect(mockedSaveWalletItem).toHaveBeenCalledWith(newItem);
  });

  it('is idempotent and ignores duplicate creates for existing IDs', () => {
    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    let outcome: ReturnType<typeof result.current.optimisticCreate> | undefined;
    act(() => {
      outcome = result.current.optimisticCreate(baseWalletItems[0]);
    });

    expect(outcome).toEqual({ ok: true });
    expect(mockedSaveWalletItem).not.toHaveBeenCalled();
  });

  it('rolls back optimistic addition when saveWalletItem fails', () => {
    mockedSaveWalletItem.mockReturnValue(false);

    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    let outcome: ReturnType<typeof result.current.optimisticCreate> | undefined;
    act(() => {
      outcome = result.current.optimisticCreate(newItem);
    });

    expect(outcome).toEqual({
      ok: false,
      code: 'PERSISTENCE_FAILED',
      stale: false,
      error: 'The wallet item could not be saved. Please try again.',
    });

    // Optimistic add then rollback
    expect(setItems).toHaveBeenCalledTimes(2);
    expect(setItems.mock.calls[1][0]).toEqual(baseWalletItems);
  });
});

describe('useOptimisticWalletMutation — optimisticUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetWalletItemVersion.mockReturnValue(1);
    mockedUpsertWalletItem.mockReturnValue({ success: true, stale: false });
    mockedUpdateWalletItem.mockReturnValue(true);
  });

  it('applies updates optimistically in lockstep with state', () => {
    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    let outcome: ReturnType<typeof result.current.optimisticUpdate> | undefined;
    act(() => {
      outcome = result.current.optimisticUpdate('w-1', { name: 'Renamed XLM' });
    });

    expect(outcome).toEqual({ ok: true });
    expect(setItems).toHaveBeenCalledWith(expect.any(Function));
    expect(mockedUpsertWalletItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'w-1', name: 'Renamed XLM', version: 2 }),
    );
  });

  it('returns WALLET_ITEM_NOT_FOUND if the target id is not found in state', () => {
    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    let outcome: ReturnType<typeof result.current.optimisticUpdate> | undefined;
    act(() => {
      outcome = result.current.optimisticUpdate('w-nonexistent', { name: 'Ghost' });
    });

    expect(outcome).toEqual({
      ok: false,
      code: 'WALLET_ITEM_NOT_FOUND',
      stale: false,
      error: 'Wallet item not found in the current list. Please reload and try again.',
    });
    expect(mockedUpsertWalletItem).not.toHaveBeenCalled();
  });

  it('detects stale version conflict and rolls back state', () => {
    mockedUpsertWalletItem.mockReturnValue({ success: false, stale: true });

    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    let outcome: ReturnType<typeof result.current.optimisticUpdate> | undefined;
    act(() => {
      outcome = result.current.optimisticUpdate('w-1', { balance: 99999 });
    });

    expect(outcome).toEqual({
      ok: false,
      code: 'STALE_VERSION',
      stale: true,
      error: 'This wallet item was updated in another session. Please reload and try again.',
    });
    expect(setItems).toHaveBeenCalledTimes(2);
    expect(setItems.mock.calls[1][0]).toEqual(baseWalletItems);
  });

  it('rolls back on general persistence failure', () => {
    mockedUpsertWalletItem.mockReturnValue({ success: false, stale: false });

    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    let outcome: ReturnType<typeof result.current.optimisticUpdate> | undefined;
    act(() => {
      outcome = result.current.optimisticUpdate('w-1', { status: 'Archived' });
    });

    expect(outcome).toEqual({
      ok: false,
      code: 'PERSISTENCE_FAILED',
      stale: false,
      error: 'The wallet item could not be saved. Please try again.',
    });
    expect(setItems).toHaveBeenCalledTimes(2);
    expect(setItems.mock.calls[1][0]).toEqual(baseWalletItems);
  });
});

describe('useOptimisticWalletMutation — optimisticDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDeleteWalletItems.mockReturnValue(true);
  });

  it('removes matching items optimistically and deduplicates IDs', () => {
    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    let outcome: ReturnType<typeof result.current.optimisticDelete> | undefined;
    act(() => {
      outcome = result.current.optimisticDelete(['w-1', 'w-1']);
    });

    expect(outcome).toEqual({ ok: true });
    expect(mockedDeleteWalletItems).toHaveBeenCalledWith(['w-1']);
    expect(setItems).toHaveBeenCalledWith(expect.any(Function));
  });

  it('returns ok: true when given empty array', () => {
    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    let outcome: ReturnType<typeof result.current.optimisticDelete> | undefined;
    act(() => {
      outcome = result.current.optimisticDelete([]);
    });

    expect(outcome).toEqual({ ok: true });
    expect(mockedDeleteWalletItems).not.toHaveBeenCalled();
  });

  it('returns DELETE_TARGET_NOT_FOUND when none of the ids match items in state', () => {
    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    let outcome: ReturnType<typeof result.current.optimisticDelete> | undefined;
    act(() => {
      outcome = result.current.optimisticDelete(['w-999']);
    });

    expect(outcome).toEqual({
      ok: false,
      code: 'DELETE_TARGET_NOT_FOUND',
      stale: false,
      error: 'No wallet items were found to delete. Please reload and try again.',
    });
    expect(mockedDeleteWalletItems).not.toHaveBeenCalled();
  });

  it('rolls back on deletion persistence failure', () => {
    mockedDeleteWalletItems.mockReturnValue(false);

    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    let outcome: ReturnType<typeof result.current.optimisticDelete> | undefined;
    act(() => {
      outcome = result.current.optimisticDelete(['w-1']);
    });

    expect(outcome).toEqual({
      ok: false,
      code: 'PERSISTENCE_FAILED',
      stale: false,
      error: 'Failed to delete wallet items. Changes have been rolled back.',
    });
    expect(setItems).toHaveBeenCalledTimes(2);
    expect(setItems.mock.calls[1][0]).toEqual(baseWalletItems);
  });
});

describe('useOptimisticWalletMutation — concurrency and mutex locking', () => {
  const newItem: WalletItem = {
    id: 'w-concurrency',
    name: 'Concurrent Token',
    type: 'Asset',
    balance: 100,
    currency: 'CONC',
    status: 'Active',
    createdAt: '2026-03-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedSaveWalletItem.mockReturnValue(true);
    mockedUpdateWalletItem.mockReturnValue(true);
    mockedDeleteWalletItems.mockReturnValue(true);
    mockedGetWalletItemVersion.mockReturnValue(1);
    mockedUpsertWalletItem.mockReturnValue({ success: true, stale: false });
  });

  it('rejects concurrent operations while a mutation is in flight with OPERATION_IN_PROGRESS', () => {
    let concurrentUpdateOutcome: ReturnType<typeof result.current.optimisticUpdate> | undefined;
    let concurrentDeleteOutcome: ReturnType<typeof result.current.optimisticDelete> | undefined;

    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    mockedSaveWalletItem.mockImplementationOnce(() => {
      // While saveWalletItem is in-flight, try invoking update and delete
      concurrentUpdateOutcome = result.current.optimisticUpdate('w-1', { name: 'Concurrent Edit' });
      concurrentDeleteOutcome = result.current.optimisticDelete(['w-2']);
      return true;
    });

    let createOutcome: ReturnType<typeof result.current.optimisticCreate> | undefined;
    act(() => {
      createOutcome = result.current.optimisticCreate(newItem);
    });

    expect(createOutcome).toEqual({ ok: true });
    expect(concurrentUpdateOutcome).toEqual({
      ok: false,
      code: 'OPERATION_IN_PROGRESS',
      stale: false,
      error: 'Another wallet operation is already in progress. Please wait.',
    });
    expect(concurrentDeleteOutcome).toEqual({
      ok: false,
      code: 'OPERATION_IN_PROGRESS',
      stale: false,
      error: 'Another wallet operation is already in progress. Please wait.',
    });
  });

  it('recovers and allows subsequent mutations after an initial failure', () => {
    mockedSaveWalletItem.mockReturnValueOnce(false);
    mockedUpdateWalletItem.mockReturnValueOnce(true);

    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    // First attempt fails
    let firstOutcome: ReturnType<typeof result.current.optimisticCreate> | undefined;
    act(() => {
      firstOutcome = result.current.optimisticCreate(newItem);
    });
    expect(firstOutcome?.ok).toBe(false);

    // Second attempt should not be blocked and succeed
    let secondOutcome: ReturnType<typeof result.current.optimisticUpdate> | undefined;
    act(() => {
      secondOutcome = result.current.optimisticUpdate('w-1', { name: 'Recovered Name' });
    });
    expect(secondOutcome).toEqual({ ok: true });
  });

  it('does not mutate the original wallet items array during mutations', () => {
    const originalSnapshot = JSON.parse(JSON.stringify(baseWalletItems));
    const setItems = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticWalletMutation(baseWalletItems, setItems),
    );

    act(() => {
      result.current.optimisticUpdate('w-1', { name: 'Mutated Name' });
    });

    expect(baseWalletItems).toEqual(originalSnapshot);
  });

  it('preserves successive updates in lockstep as state updates', () => {
    const { result } = renderHook(() => {
      const [items, setItems] = React.useState<WalletItem[]>(baseWalletItems);
      const mutation = useOptimisticWalletMutation(items, setItems);
      return { mutation, items };
    });

    act(() => {
      result.current.mutation.optimisticUpdate('w-1', { name: 'First Update' });
    });

    act(() => {
      result.current.mutation.optimisticUpdate('w-1', { balance: 99999 });
    });

    // The second upsert must contain the patched name from the first update
    expect(mockedUpsertWalletItem).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'w-1',
        name: 'First Update',
        balance: 99999,
      }),
    );
  });
});

