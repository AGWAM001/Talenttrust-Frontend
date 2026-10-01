import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MilestonesPage from '../milestones/page';
import { ToastProvider } from '@/components/toast/toast-provider';

jest.mock('next/navigation', () => {
  const original = jest.requireActual('next/navigation');
  return {
    ...original,
    useSearchParams: jest.fn(),
    useRouter: jest.fn(),
  };
});

jest.mock('@/lib/repository', () => ({
  listMilestones: jest.fn(() => []),
  saveMilestone: jest.fn(),
  upsertMilestone: jest.fn(() => ({ success: true, stale: false })),
  getMilestoneVersion: jest.fn(() => 0),
  deleteMilestones: jest.fn(() => 0),
}));

jest.mock('@/lib/safeStorage', () => ({
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
}));

import { useSearchParams, useRouter } from 'next/navigation';
import { upsertMilestone } from '@/lib/repository';

describe('Milestones page URL state sync', () => {
  const replaceMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    replaceMock.mockReset();
    (useRouter as jest.Mock).mockReturnValue({ replace: replaceMock });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('initializes filter and sort from the URL query', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => (key === 'status' ? 'Paid' : key === 'sort' ? 'oldest' : null),
      toString: () => 'status=Paid&sort=oldest',
    });
    render(<ToastProvider><MilestonesPage /></ToastProvider>);
    const paidRadio = screen.getByRole('radio', { name: 'Paid' }) as HTMLInputElement;
    const sortSelect = screen.getByLabelText('Sort milestones') as HTMLSelectElement;

    expect(paidRadio.checked).toBe(true);
    expect(sortSelect.value).toBe('oldest');
  });

  it('defaults to safe values for invalid status and sort params', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => (key === 'status' ? 'Bogus' : key === 'sort' ? 'middle' : null),
      toString: () => 'status=Bogus&sort=middle',
    });
    render(<ToastProvider><MilestonesPage /></ToastProvider>);
    const allRadio = screen.getByRole('radio', { name: 'All' }) as HTMLInputElement;
    const sortSelect = screen.getByLabelText('Sort milestones') as HTMLSelectElement;

    expect(allRadio.checked).toBe(true);
    expect(sortSelect.value).toBe('newest');
  });

  it('rejects repeated query keys and accepts exact enum boundary values', async () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn(),
      toString: () => 'status=Disputed&status=Paid&sort=oldest&sort=newest&campaign=spring',
    });
    const duplicateParams = render(<ToastProvider><MilestonesPage /></ToastProvider>);

    expect((screen.getByRole('radio', { name: 'All' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Sort milestones') as HTMLSelectElement).value).toBe('newest');
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('?campaign=spring');
    });
    duplicateParams.unmount();

    replaceMock.mockClear();
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn(),
      toString: () => 'status=Disputed&sort=oldest',
    });
    render(<ToastProvider><MilestonesPage /></ToastProvider>);

    expect((screen.getByRole('radio', { name: 'Disputed' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Sort milestones') as HTMLSelectElement).value).toBe('oldest');
  });

  it('persists a milestone only once when its form is submitted twice before rerender', () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn(),
      toString: () => '',
    });
    jest.spyOn(Date, 'now').mockReturnValue(1234);
    render(<ToastProvider><MilestonesPage /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Add Milestone' }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Boundary case' } });
    fireEvent.change(screen.getByLabelText(/payout amount/i), { target: { value: '1' } });
    const form = screen.getByRole('dialog').querySelector('form');

    expect(form).not.toBeNull();
    act(() => {
      fireEvent.submit(form!);
      fireEvent.submit(form!);
    });

    expect(upsertMilestone).toHaveBeenCalledTimes(1);
    expect(screen.getByText('A milestone with this identifier already exists.')).toBeInTheDocument();
  });

  it('debounces URL updates when filter or sort changes', async () => {
    (useSearchParams as jest.Mock).mockReturnValue({
      get: () => null,
      toString: () => '',
    });
    render(<ToastProvider><MilestonesPage /></ToastProvider>);
    const pendingRadio = screen.getByRole('radio', { name: 'Pending' }) as HTMLInputElement;
    fireEvent.click(pendingRadio);
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('?status=Pending');
    });
  });
});
