/**
 * jest-axe accessibility tests for the Milestones view.
 *
 * Covers key view states:
 *   - Loaded state (sample milestones banner, custom milestones, filter/sort options)
 *   - Empty state (zero milestones tracked, filter results empty)
 *   - Error state (MilestonesError route boundary, SafeBoundary component fallback)
 *   - Form state (MilestoneCreationForm modal open)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { assertNoA11yViolations } from '@/test-utils/a11y';
import MilestonesPage from '../page';
import MilestonesError from '../error';
import SafeBoundary from '@/components/SafeBoundary';
import { PreferencesProvider } from '@/lib/preferences';
import { resetCache } from '@/lib/safeStorage';
import * as repository from '@/lib/repository';
import type { Milestone } from '@/types/domain';

// ---------------------------------------------------------------------------
// Navigation and Hook Mocks
// ---------------------------------------------------------------------------

const mockSearchParams = {
  get: jest.fn((_param: string): string | null => null),
  toString: jest.fn(() => ''),
};
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copied: false,
    copy: jest.fn().mockResolvedValue(true),
  }),
}));

jest.mock('@/lib/repository', () => ({
  listMilestones: jest.fn(),
  upsertMilestone: jest.fn(() => ({ success: true, stale: false })),
  saveMilestone: jest.fn(),
  updateMilestone: jest.fn(),
  getMilestoneVersion: jest.fn(() => 0),
  deleteMilestones: jest.fn(() => 0),
}));

const mockedListMilestones = jest.mocked(repository.listMilestones);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderMilestonesView() {
  return render(
    <PreferencesProvider>
      <MilestonesPage />
    </PreferencesProvider>,
  );
}

const samplePersistedMilestones: Milestone[] = [
  {
    id: 'm-1',
    title: 'Design System Audit',
    status: 'Pending',
    payout: 1200,
    currency: 'USD',
    dueDate: '2026-08-15',
  },
  {
    id: 'm-2',
    title: 'Smart Contract Integration',
    status: 'Completed',
    payout: 3500,
    currency: 'USD',
    dueDate: '2026-07-01',
  },
  {
    id: 'm-3',
    title: 'Security Compliance Check',
    status: 'Paid',
    payout: 2000,
    currency: 'USD',
    dueDate: '2026-06-10',
  },
];

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe('Milestones view a11y — Loaded State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    resetCache();
    mockSearchParams.get.mockImplementation(() => null);
    mockedListMilestones.mockReturnValue([]);
  });

  it('has zero accessibility violations with default sample data state', async () => {
    const { container } = renderMilestonesView();
    expect(screen.getByText("You're viewing sample data")).toBeInTheDocument();
    await assertNoA11yViolations(container);
  });

  it('has zero accessibility violations with persisted milestones loaded', async () => {
    mockedListMilestones.mockReturnValue(samplePersistedMilestones);
    const { container } = renderMilestonesView();
    expect(screen.getByText('Design System Audit')).toBeInTheDocument();
    await assertNoA11yViolations(container);
  });

  it('has zero accessibility violations when status filter is applied', async () => {
    mockedListMilestones.mockReturnValue(samplePersistedMilestones);
    mockSearchParams.get.mockImplementation((param) => (param === 'status' ? 'Completed' : null));
    const { container } = renderMilestonesView();
    expect(screen.getByText('Smart Contract Integration')).toBeInTheDocument();
    expect(screen.queryByText('Design System Audit')).not.toBeInTheDocument();
    await assertNoA11yViolations(container);
  });

  it('has zero accessibility violations when sort order is changed', async () => {
    mockedListMilestones.mockReturnValue(samplePersistedMilestones);
    mockSearchParams.get.mockImplementation((param) => (param === 'sort' ? 'oldest' : null));
    const { container } = renderMilestonesView();
    const sortSelect = screen.getByLabelText(/sort milestones/i);
    expect(sortSelect).toHaveValue('oldest');
    await assertNoA11yViolations(container);
  });
});

describe('Milestones view a11y — Empty State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockSearchParams.get.mockImplementation(() => null);
  });

  it('has zero accessibility violations in zero-milestones state after dismissing sample data', async () => {
    mockedListMilestones.mockReturnValue([]);
    const user = userEvent.setup();
    const { container } = renderMilestonesView();

    const startFromScratchBtn = screen.getByTestId('start-from-scratch-btn');
    await user.click(startFromScratchBtn);

    expect(screen.getByText('No milestones tracked')).toBeInTheDocument();
    await assertNoA11yViolations(container);
  });

  it('has zero accessibility violations when filter returns zero matching milestones', async () => {
    mockedListMilestones.mockReturnValue(samplePersistedMilestones);
    mockSearchParams.get.mockImplementation((param) => (param === 'status' ? 'Disputed' : null));
    const { container } = renderMilestonesView();

    expect(screen.getByText('No milestones match this filter')).toBeInTheDocument();
    await assertNoA11yViolations(container);
  });
});

describe('Milestones view a11y — Creation Form Modal State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockSearchParams.get.mockImplementation(() => null);
    mockedListMilestones.mockReturnValue(samplePersistedMilestones);
  });

  it('has zero accessibility violations when MilestoneCreationForm dialog is open', async () => {
    const user = userEvent.setup();
    const { container } = renderMilestonesView();

    const addBtn = screen.getByRole('button', { name: /^add milestone$/i });
    await user.click(addBtn);

    expect(await screen.findByRole('dialog', { name: /add milestone/i })).toBeInTheDocument();
    await assertNoA11yViolations(container);
  });
});

describe('Milestones view a11y — Error State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has zero accessibility violations in Next.js MilestonesError route error state', async () => {
    const mockReset = jest.fn();
    const mockError = new Error('Failed to load milestones data');

    const { container } = render(
      <MilestonesError error={mockError} reset={mockReset} />,
    );

    expect(screen.getByRole('heading', { name: /unable to load milestones/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    await assertNoA11yViolations(container);
  });

  it('has zero accessibility violations in SafeBoundary fallback error state', async () => {
    const ThrowingComponent = () => {
      throw new Error('Test crash in milestones subcomponent');
    };

    const originalConsoleError = console.error;
    console.error = jest.fn();

    const { container } = render(
      <SafeBoundary fallbackTitle="Milestones failed to load.">
        <ThrowingComponent />
      </SafeBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Milestones failed to load.')).toBeInTheDocument();
    await assertNoA11yViolations(container);

    console.error = originalConsoleError;
  });
});
