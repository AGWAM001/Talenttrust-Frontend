import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReputationProfile, { type ReputationEvent } from '../../components/ReputationProfile';
import { REPUTATION_URL_DEBOUNCE_MS } from '@/lib/reputationUrlState';

jest.mock('next/navigation', () => {
  const original = jest.requireActual('next/navigation');
  return {
    ...original,
    useSearchParams: jest.fn(),
    useRouter: jest.fn(),
  };
});

import { useSearchParams, useRouter } from 'next/navigation';

const HISTORY: ReputationEvent[] = [
  {
    id: 'ev-1',
    type: 'Verification',
    summary: 'Completed identity verification',
    date: '2026-04-24',
  },
  {
    id: 'ev-2',
    type: 'On-chain review',
    summary: 'Received positive trust signal',
    date: '2026-04-23',
  },
  {
    id: 'ev-3',
    type: 'Referral',
    summary: 'Referred two new community members',
    date: '2026-04-20',
  },
];

function mockSearchParams(query: string) {
  const params = new URLSearchParams(query);
  (useSearchParams as jest.Mock).mockReturnValue({
    get: (key: string) => params.get(key),
    toString: () => params.toString(),
  });
}

describe('ReputationProfile URL filter/sort sync', () => {
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

  it('restores filter and sort from the URL on load', () => {
    mockSearchParams('type=Referral&dir=asc');
    render(
      <ReputationProfile name="URL User" score={80} history={HISTORY} />
    );

    expect(screen.getByTestId('reputation-type-filter')).toHaveValue('Referral');
    expect(screen.getByTestId('reputation-sort-dir')).toHaveValue('asc');

    const items = within(document.querySelector('ol')!).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByText(/Referred two new community members/i)).toBeInTheDocument();
  });

  it('ignores invalid URL params and falls back to defaults', () => {
    mockSearchParams('type=NotReal&dir=sideways&sort=score');
    render(
      <ReputationProfile name="URL User" score={80} history={HISTORY} />
    );

    expect(screen.getByTestId('reputation-type-filter')).toHaveValue('All');
    expect(screen.getByTestId('reputation-sort-dir')).toHaveValue('desc');

    const items = within(document.querySelector('ol')!).getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('debounces URL updates when filter/sort change (shareable query)', () => {
    mockSearchParams('');
    render(
      <ReputationProfile name="URL User" score={80} history={HISTORY} />
    );

    fireEvent.change(screen.getByTestId('reputation-type-filter'), {
      target: { value: 'Verification' },
    });
    fireEvent.change(screen.getByTestId('reputation-sort-dir'), {
      target: { value: 'asc' },
    });

    expect(replaceMock).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(REPUTATION_URL_DEBOUNCE_MS);
    });

    expect(replaceMock).toHaveBeenCalledWith('?type=Verification&dir=asc');
  });

  it('does not write defaults back to the URL when already clean', () => {
    mockSearchParams('');
    render(
      <ReputationProfile name="URL User" score={80} history={HISTORY} />
    );

    act(() => {
      jest.advanceTimersByTime(REPUTATION_URL_DEBOUNCE_MS);
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('round-trips: URL → UI → URL for a non-default state', () => {
    mockSearchParams('type=On-chain review&dir=asc');
    render(
      <ReputationProfile name="URL User" score={80} history={HISTORY} />
    );

    expect(screen.getByTestId('reputation-type-filter')).toHaveValue('On-chain review');
    expect(screen.getByTestId('reputation-sort-dir')).toHaveValue('asc');

    fireEvent.change(screen.getByTestId('reputation-type-filter'), {
      target: { value: 'Verification' },
    });

    act(() => {
      jest.advanceTimersByTime(REPUTATION_URL_DEBOUNCE_MS);
    });

    expect(replaceMock).toHaveBeenCalledWith('?type=Verification&dir=asc');
  });

  it('skips URL writes when syncUrl is false', () => {
    mockSearchParams('');
    render(
      <ReputationProfile
        name="Local User"
        score={80}
        history={HISTORY}
        syncUrl={false}
      />
    );

    fireEvent.change(screen.getByTestId('reputation-type-filter'), {
      target: { value: 'Verification' },
    });

    act(() => {
      jest.advanceTimersByTime(REPUTATION_URL_DEBOUNCE_MS);
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
