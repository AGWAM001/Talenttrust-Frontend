import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { OfflineIndicator } from '../OfflineIndicator';
import * as useOnlineStatusModule from '@/hooks/useOnlineStatus';

jest.mock('@/hooks/useOnlineStatus');

const mockedUseOnlineStatus = jest.mocked(useOnlineStatusModule.useOnlineStatus);

describe('OfflineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering behavior', () => {
    it('renders nothing when user is online and data is not stale', () => {
      mockedUseOnlineStatus.mockReturnValue(true);

      const { container } = render(<OfflineIndicator isStale={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders offline message when user is offline', () => {
      mockedUseOnlineStatus.mockReturnValue(false);

      render(<OfflineIndicator isStale={false} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(
        screen.getByText('You are offline. Showing previously loaded data.'),
      ).toBeInTheDocument();
    });

    it('renders stale data message when online but data is stale', () => {
      mockedUseOnlineStatus.mockReturnValue(true);

      render(<OfflineIndicator isStale={true} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(
        screen.getByText('This data may be outdated. Last updated recently.'),
      ).toBeInTheDocument();
    });

    it('formats cached time correctly when provided', () => {
      mockedUseOnlineStatus.mockReturnValue(false);

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      render(<OfflineIndicator isStale={true} cachedAt={tenMinutesAgo} />);

      expect(screen.getByText(/Cached 10 minutes ago/i)).toBeInTheDocument();
    });

    it('formats cached time as "just now" for very recent timestamps', () => {
      mockedUseOnlineStatus.mockReturnValue(false);

      const justNow = new Date(Date.now() - 10 * 1000).toISOString();
      render(<OfflineIndicator isStale={false} cachedAt={justNow} />);

      expect(screen.getByText(/Cached just now/i)).toBeInTheDocument();
    });

    it('formats cached time in hours and days appropriately', () => {
      mockedUseOnlineStatus.mockReturnValue(false);

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { rerender } = render(<OfflineIndicator isStale={true} cachedAt={twoHoursAgo} />);
      expect(screen.getByText(/Cached 2 hours ago/i)).toBeInTheDocument();

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      rerender(<OfflineIndicator isStale={true} cachedAt={threeDaysAgo} />);
      expect(screen.getByText(/Cached 3 days ago/i)).toBeInTheDocument();
    });
  });

  describe('accessibility (a11y)', () => {
    it('has role="status" and aria-live="polite"', () => {
      mockedUseOnlineStatus.mockReturnValue(false);

      render(<OfflineIndicator isStale={false} />);

      const statusEl = screen.getByRole('status');
      expect(statusEl).toHaveAttribute('aria-live', 'polite');
      expect(statusEl).toHaveAttribute('aria-label', 'You are offline');
    });

    it('passes axe accessibility audit when offline', async () => {
      mockedUseOnlineStatus.mockReturnValue(false);

      const { container } = render(
        <main>
          <h1>Contract Title</h1>
          <OfflineIndicator isStale={false} cachedAt={new Date().toISOString()} />
        </main>,
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('passes axe accessibility audit when displaying stale data', async () => {
      mockedUseOnlineStatus.mockReturnValue(true);

      const { container } = render(
        <main>
          <h1>Contract Title</h1>
          <OfflineIndicator isStale={true} cachedAt={new Date(Date.now() - 300000).toISOString()} />
        </main>,
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });
});
