import { renderHook, act } from '@testing-library/react';
import { useOptimisticReputationMutation } from '../useOptimisticReputationMutation';
import * as repository from '@/lib/repository';
import type { ReputationEvent } from '@/types/domain';

jest.mock('@/lib/repository', () => ({
  ...jest.requireActual('@/lib/repository'),
  upsertReputationEvent: jest.fn(),
  getReputationEventVersion: jest.fn(),
  deleteReputationEvents: jest.fn(),
}));

const mockedUpsertReputationEvent = jest.mocked(repository.upsertReputationEvent);
const mockedGetReputationEventVersion = jest.mocked(repository.getReputationEventVersion);
const mockedDeleteReputationEvents = jest.mocked(repository.deleteReputationEvents);

const baseEvents: ReputationEvent[] = [
  {
    id: 'evt-1',
    type: 'contract_completed',
    summary: 'Completed Design Contract',
    date: '2025-01-01',
  },
  {
    id: 'evt-2',
    type: 'milestone_completed',
    summary: 'Completed UI Design Milestone',
    date: '2025-02-01',
  },
];

// =============================================================================
// optimisticCreate
// =============================================================================

describe('useOptimisticReputationMutation — optimisticCreate', () => {
  const newEvent: ReputationEvent = {
    id: 'evt-new',
    type: 'review_received',
    summary: 'Received 5 stars',
    date: '2025-03-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies the new event optimistically before persistence', () => {
    mockedUpsertReputationEvent.mockReturnValue({ success: true, stale: false });

    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    act(() => {
      result.current.optimisticCreate(newEvent);
    });

    expect(setEvents).toHaveBeenCalledWith(expect.any(Function));
    expect(mockedUpsertReputationEvent).toHaveBeenCalledWith(newEvent);
  });

  it('returns { ok: true } on successful persistence', () => {
    mockedUpsertReputationEvent.mockReturnValue({ success: true, stale: false });

    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    let outcome: ReturnType<typeof result.current.optimisticCreate> | undefined;
    act(() => {
      outcome = result.current.optimisticCreate(newEvent);
    });

    expect(outcome).toEqual({ ok: true });
  });

  it('rolls back the optimistic event when persistence fails', () => {
    mockedUpsertReputationEvent.mockReturnValue({ success: false, stale: false });

    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    let outcome: ReturnType<typeof result.current.optimisticCreate> | undefined;
    act(() => {
      outcome = result.current.optimisticCreate(newEvent);
    });

    expect(outcome).toEqual({
      ok: false,
      stale: false,
      error: 'The reputation event could not be saved. Please try again.',
    });

    expect(setEvents).toHaveBeenCalledTimes(2);
    expect(setEvents.mock.calls[1][0]).toEqual(baseEvents);
  });

  it('rolls back and returns stale:true when a stale overwrite is detected', () => {
    mockedUpsertReputationEvent.mockReturnValue({ success: false, stale: true });

    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    let outcome: ReturnType<typeof result.current.optimisticCreate> | undefined;
    act(() => {
      outcome = result.current.optimisticCreate(newEvent);
    });

    expect(outcome).toEqual({
      ok: false,
      stale: true,
      error: 'This reputation event was updated in another session. Please reload and try again.',
    });
  });
});

// =============================================================================
// optimisticUpdate
// =============================================================================

describe('useOptimisticReputationMutation — optimisticUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetReputationEventVersion.mockReturnValue(0);
  });

  it('applies the patch optimistically before persistence', () => {
    mockedUpsertReputationEvent.mockReturnValue({ success: true, stale: false });

    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    act(() => {
      result.current.optimisticUpdate('evt-1', { summary: 'Updated Summary' });
    });

    const stateUpdater = setEvents.mock.calls[0][0];
    const updatedState = stateUpdater(baseEvents);
    expect(updatedState[0]).toEqual(
      expect.objectContaining({ id: 'evt-1', summary: 'Updated Summary' }),
    );
    expect(updatedState[1]).toEqual(baseEvents[1]);

    expect(mockedGetReputationEventVersion).toHaveBeenCalledWith('evt-1');
    expect(mockedUpsertReputationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt-1', summary: 'Updated Summary', version: 0 }),
    );
  });

  it('returns { ok: true } on successful persistence', () => {
    mockedUpsertReputationEvent.mockReturnValue({ success: true, stale: false });

    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    let outcome: ReturnType<typeof result.current.optimisticUpdate> | undefined;
    act(() => {
      outcome = result.current.optimisticUpdate('evt-1', { summary: 'Updated' });
    });

    expect(outcome).toEqual({ ok: true });
  });

  it('rolls back the optimistic update when persistence fails', () => {
    mockedUpsertReputationEvent.mockReturnValue({ success: false, stale: false });

    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    act(() => {
      result.current.optimisticUpdate('evt-1', { summary: 'Updated' });
    });

    expect(setEvents).toHaveBeenCalledTimes(2);
    expect(setEvents.mock.calls[1][0]).toEqual(baseEvents);
  });

  it('rolls back and returns stale:true when a stale overwrite is detected', () => {
    mockedUpsertReputationEvent.mockReturnValue({ success: false, stale: true });

    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    let outcome: ReturnType<typeof result.current.optimisticUpdate> | undefined;
    act(() => {
      outcome = result.current.optimisticUpdate('evt-1', { summary: 'Updated' });
    });

    expect(outcome).toEqual({
      ok: false,
      stale: true,
      error: 'This reputation event was updated in another session. Please reload and try again.',
    });
  });

  it('rolls back and returns error when the event id is not found in state', () => {
    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    let outcome: ReturnType<typeof result.current.optimisticUpdate> | undefined;
    act(() => {
      outcome = result.current.optimisticUpdate('nonexistent-id', { summary: 'Updated' });
    });

    expect(outcome).toEqual({
      ok: false,
      stale: false,
      error: 'Reputation event not found in the current list. Please reload and try again.',
    });

    expect(setEvents).toHaveBeenCalledTimes(2);
  });

  it('passes the correct stored version to upsertReputationEvent', () => {
    mockedGetReputationEventVersion.mockReturnValue(3);
    mockedUpsertReputationEvent.mockReturnValue({ success: true, stale: false });

    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    act(() => {
      result.current.optimisticUpdate('evt-1', { summary: 'Updated' });
    });

    expect(mockedGetReputationEventVersion).toHaveBeenCalledWith('evt-1');
    expect(mockedUpsertReputationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'evt-1', version: 3 }),
    );
  });
});

// =============================================================================
// optimisticDelete
// =============================================================================

describe('useOptimisticReputationMutation — optimisticDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes events optimistically before persistence', () => {
    mockedDeleteReputationEvents.mockReturnValue(1);

    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    act(() => {
      result.current.optimisticDelete(['evt-1']);
    });

    const stateUpdater = setEvents.mock.calls[0][0];
    const updatedState = stateUpdater(baseEvents);
    expect(updatedState).toHaveLength(1);
    expect(updatedState[0].id).toBe('evt-2');

    expect(mockedDeleteReputationEvents).toHaveBeenCalledWith(['evt-1']);
  });

  it('returns { ok: true } on successful deletion', () => {
    mockedDeleteReputationEvents.mockReturnValue(1);

    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    let outcome: ReturnType<typeof result.current.optimisticDelete> | undefined;
    act(() => {
      outcome = result.current.optimisticDelete(['evt-1']);
    });

    expect(outcome).toEqual({ ok: true });
  });

  it('rolls back when no events were actually deleted', () => {
    mockedDeleteReputationEvents.mockReturnValue(0);

    const setEvents = jest.fn();
    const { result } = renderHook(() =>
      useOptimisticReputationMutation(baseEvents, setEvents),
    );

    act(() => {
      result.current.optimisticDelete(['nonexistent-id']);
    });

    expect(setEvents).toHaveBeenCalledTimes(2);
    expect(setEvents.mock.calls[1][0]).toEqual(baseEvents);
  });
});
