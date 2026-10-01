import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
}));

jest.mock('@/lib/safeStorage', () => ({
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
}));

import { useSearchParams, useRouter } from 'next/navigation';

describe('Milestones page URL state sync', () => {
  const replaceMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    replaceMock.mockReset();
    (useRouter as jest.Mock).mockReturnValue({ replace: replaceMock });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
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
