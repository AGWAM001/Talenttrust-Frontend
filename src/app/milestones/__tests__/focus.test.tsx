import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MilestonesPage from '../page';
import { SAMPLE_DISMISSED_KEY } from '../constants';
import { MilestoneCreationForm } from '@/components/milestones/MilestoneCreationForm';
import { listMilestones } from '@/lib/repository';

// Mocks
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn(() => null),
    toString: jest.fn(() => ''),
  }),
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('@/lib/repository', () => ({
  listMilestones: jest.fn(() => []),
  saveMilestone: jest.fn(() => true),
  updateMilestone: jest.fn(() => true),
  upsertMilestone: jest.fn(() => ({ success: true, stale: false })),
}));

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

describe('Milestones Focus Management (Issue #682)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    (listMilestones as jest.Mock).mockReturnValue([]);
  });

  describe('Milestones Route & Page Focus', () => {
    it('has a focusable h1 heading with tabIndex={-1}', () => {
      render(<MilestonesPage />);
      const heading = screen.getByRole('heading', { level: 1, name: 'Milestones' });
      expect(heading).toHaveAttribute('tabindex', '-1');
    });

    it('moves focus to the main h1 heading when the sample data banner is dismissed', async () => {
      const user = userEvent.setup();
      render(<MilestonesPage />);

      const startScratchBtn = screen.getByTestId('start-from-scratch-btn');
      expect(startScratchBtn).toBeInTheDocument();

      await user.click(startScratchBtn);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1, name: 'Milestones' });
        expect(document.activeElement).toBe(heading);
      });
    });
  });

  describe('Milestones Dialog Focus Trap & Keyboard Navigation', () => {
    it('moves initial focus to the title input when MilestoneCreationForm opens', async () => {
      const handleCancel = jest.fn();
      const handleSubmit = jest.fn();

      render(
        <MilestoneCreationForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      );

      const titleInput = screen.getByLabelText(/Title/i);
      expect(document.activeElement).toBe(titleInput);
    });

    it('traps focus within MilestoneCreationForm when pressing Tab and Shift+Tab', async () => {
      const handleCancel = jest.fn();
      const handleSubmit = jest.fn();

      render(
        <MilestoneCreationForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      expect(focusableElements.length).toBeGreaterThan(1);

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Focus the last element and press Tab -> should cycle to first element
      lastElement.focus();
      expect(document.activeElement).toBe(lastElement);

      fireEvent.keyDown(document, { key: 'Tab' });
      expect(document.activeElement).toBe(firstElement);

      // Focus first element and press Shift+Tab -> should cycle to last element
      firstElement.focus();
      expect(document.activeElement).toBe(firstElement);

      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(lastElement);
    });

    it('invokes onCancel when Escape key is pressed inside MilestoneCreationForm', async () => {
      const handleCancel = jest.fn();
      const handleSubmit = jest.fn();

      render(
        <MilestoneCreationForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      );

      fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('restores focus to trigger button when MilestoneCreationForm closes', async () => {
      const user = userEvent.setup();
      render(<MilestonesPage />);

      // Open creation form from Add Milestone button
      const addButtons = screen.getAllByRole('button', { name: /Add Milestone/i });
      const triggerBtn = addButtons[0];
      await user.click(triggerBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Cancel creation form
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.activeElement).toBe(triggerBtn);
      });
    });

    it('falls back focus to h1 heading if trigger element unmounts upon dialog close', async () => {
      const user = userEvent.setup();
      
      // Render page with sample data dismissed so EmptyState action button is rendered
      localStorage.setItem(SAMPLE_DISMISSED_KEY, 'true');
      render(<MilestonesPage />);

      const emptyAddBtn = screen.getByRole('button', { name: /Add Milestone/i });
      await user.click(emptyAddBtn);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Submit a milestone so EmptyState is replaced by MilestonesList (unmounting emptyAddBtn)
      const titleInput = screen.getByLabelText(/Title/i);
      const payoutInput = screen.getByLabelText(/Payout Amount/i);
      await user.type(titleInput, 'New Milestone');
      await user.type(payoutInput, '1000');
      const dialog = screen.getByRole('dialog');
      const submitBtn = within(dialog).getByRole('button', { name: /Add Milestone/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        const heading = screen.getByRole('heading', { level: 1, name: 'Milestones' });
        expect(document.activeElement).toBe(heading);
      });
    });
  });
});
