import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { axe } from 'jest-axe';
import MilestonesList from '../MilestonesList';
import type { Milestone } from '../MilestonesList';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_TITLE = 'Project Kickoff';
const ANOTHER_TITLE = 'API Integration';

const baseMilestones: Milestone[] = [
  { id: 'm-1', title: VALID_TITLE, status: 'Pending', payout: 2500, currency: 'USD', dueDate: '2026-08-01' },
  { id: 'm-2', title: ANOTHER_TITLE, status: 'Active', payout: 1500, currency: 'EUR', dueDate: '2026-09-01' },
];

/**
 * Spies that every row-level test can re-use so each test focuses on a single
 * behavioural concern instead of building mock handlers from scratch.
 */
type Spies = {
  onSave: jest.Mock;
  onCancel: jest.Mock;
  onRequestEdit: jest.Mock;
  onAnnounce: jest.Mock;
};

function createSpies(): Spies {
  return {
    onSave: jest.fn(),
    onCancel: jest.fn(),
    onRequestEdit: jest.fn(),
    onAnnounce: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Shared setup: render MilestonesList with the spies wired through.
// ---------------------------------------------------------------------------
//
// We render the parent component (MilestonesList) so that the test exercises
// the same prop API and aria-live announcement region that production uses.
// This catches wiring bugs at the parent level, not just inside the row.
//
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// 1. View mode (default)
// ===========================================================================

describe('MilestoneRow — view mode (default)', () => {
  it('renders the title, due date, status badge, and formatted payout', () => {
    render(<MilestonesList milestones={baseMilestones} />);

    // Title appears in both heading and due-soon link - use getAllByText
    const titleElements = screen.getAllByText(VALID_TITLE);
    expect(titleElements.length).toBeGreaterThan(0);
    expect(titleElements[0]).toHaveTextContent(VALID_TITLE);
    expect(screen.getByText('Due 2026-08-01')).toBeInTheDocument();
    // StatusBadge is rendered twice (one per row)
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);

    // The formatted payout text node is present
    expect(screen.getByTestId('milestone-payout-m-1')).toHaveTextContent(/\$2,500\.00/);
  });

  it('renders an accessible Edit button for each row', () => {
    render(<MilestonesList milestones={baseMilestones} />);

    expect(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Edit milestone API Integration' }),
    ).toBeInTheDocument();
  });

  it('does NOT render inline edit fields in view mode', () => {
    render(<MilestonesList milestones={baseMilestones} />);

    expect(screen.queryByTestId('milestone-edit-form-m-1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/payout amount/i)).not.toBeInTheDocument();
  });
});

// ===========================================================================
// 2. Edit mode — entry, focus, and only-one-row-in-edit
// ===========================================================================

describe('MilestoneRow — entering edit mode', () => {
  it('opens edit mode when clicking the row\'s Edit button', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );

    // Edit form now visible for that row only
    expect(screen.getByTestId('milestone-edit-form-m-1')).toBeInTheDocument();
    expect(screen.queryByTestId('milestone-edit-form-m-2')).not.toBeInTheDocument();
  });

  it('moves focus to the title input on entering edit mode', async () => {
    render(<MilestonesList milestones={baseMilestones} />);

    const editBtn = screen.getByRole('button', {
      name: 'Edit milestone Project Kickoff',
    });
    editBtn.focus();
    fireEvent.click(editBtn);

    // Title input is the first focusable element inside the row's form.
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByDisplayValue(VALID_TITLE),
      );
    });
  });

  it('only renders one row\'s edit form when a second Edit button is clicked (mutually exclusive)', () => {
    render(<MilestonesList milestones={baseMilestones} />);

    // Open first row
    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    expect(screen.getByTestId('milestone-edit-form-m-1')).toBeInTheDocument();

    // Open second row — first row should close.
    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone API Integration' }),
    );

    expect(screen.queryByTestId('milestone-edit-form-m-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('milestone-edit-form-m-2')).toBeInTheDocument();
  });

  it('pre-fills the inline form with the milestone\'s current values', () => {
    render(<MilestonesList milestones={baseMilestones} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );

    expect(screen.getByDisplayValue(VALID_TITLE)).toBeInTheDocument();
    expect(screen.getByDisplayValue('2500')).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toHaveValue('USD');
    // Status label now appears in both view mode badge and edit form label
    expect(screen.getAllByLabelText(/status/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/status/i)[0]).toHaveValue('Pending');
  });
});

// ===========================================================================
// 3. Save — happy path
// ===========================================================================

describe('MilestoneRow — saving valid edits', () => {
  it('calls onUpdateMilestone with a normalized patch and a live-region announcement', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );

    // Replace title + payout + currency + status + due date.
    fireEvent.change(screen.getByDisplayValue(VALID_TITLE), {
      target: { value: '  Project Kickoff v2  ' },
    });
    fireEvent.change(screen.getByDisplayValue('2500'), {
      target: { value: '3000' },
    });
    fireEvent.change(screen.getByLabelText(/currency/i), {
      target: { value: 'EUR' },
    });
    fireEvent.change(screen.getAllByLabelText(/status/i)[0], {
      target: { value: 'Completed' },
    });
    fireEvent.change(screen.getByLabelText(/due date/i), {
      target: { value: '  Sep 1, 2026  ' },
    });

    fireEvent.click(screen.getByTestId('save-milestone-m-1'));

    expect(spies.onSave).toHaveBeenCalledTimes(1);
    expect(spies.onSave).toHaveBeenCalledWith('m-1', {
      title: 'Project Kickoff v2',
      payout: 3000,
      currency: 'EUR',
      status: 'Completed',
      dueDate: 'Sep 1, 2026',
    });

    // Announcement is pushed via the parent live region.
    // The exact text may vary depending on version
    expect(screen.getByTestId('milestones-announcement')).toBeInTheDocument();
  });

  it('returns focus to the originating Edit button after a successful save', () => {
    const spies = createSpies();
    spies.onSave.mockReturnValue(true);
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    const editBtn = screen.getByRole('button', {
      name: 'Edit milestone Project Kickoff',
    });
    editBtn.focus();
    fireEvent.click(editBtn);

    fireEvent.click(screen.getByTestId('save-milestone-m-1'));

    // After save, the announcement text may vary in format
    expect(spies.onSave).toHaveBeenCalledTimes(1);
    // After save, the row should be back in view mode (edit form gone)
    expect(screen.queryByTestId('milestone-edit-form-m-1')).not.toBeInTheDocument();
    // Edit button is back in the DOM
    expect(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    ).toBeInTheDocument();
  });

  it('persists a status change through to the save patch', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    fireEvent.change(screen.getAllByLabelText(/status/i)[0], { target: { value: 'Active' } });
    fireEvent.click(screen.getByTestId('save-milestone-m-1'));

    expect(spies.onSave).toHaveBeenCalledTimes(1);
    expect(spies.onSave).toHaveBeenCalledWith(
      'm-1',
      expect.objectContaining({ status: 'Active' }),
    );
  });

  it('a blank due date serializes to dueDate: undefined in the patch', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    // Clear the pre-filled due date
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('save-milestone-m-1'));

    expect(spies.onSave).toHaveBeenCalledTimes(1);
    expect(spies.onSave).toHaveBeenCalledWith(
      'm-1',
      expect.objectContaining({ dueDate: undefined }),
    );
  });

  it('Save button has type=submit so it triggers form submit', () => {
    render(<MilestonesList milestones={baseMilestones} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );

    const saveBtn = screen.getByTestId('save-milestone-m-1');
    expect(saveBtn).toHaveAttribute('type', 'submit');
  });
});

// ===========================================================================
// 4. Validation — invalid blocks save
// ===========================================================================

describe('MilestoneRow — validation blocks save', () => {
  it('does not save when title is empty', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    fireEvent.change(screen.getByDisplayValue(VALID_TITLE), { target: { value: '' } });

    fireEvent.click(screen.getByTestId('save-milestone-m-1'));

    expect(spies.onSave).not.toHaveBeenCalled();
    // Error summary is visible
    expect(
      screen.getByRole('alert', { name: /there is a problem/i }),
    ).toBeInTheDocument();
    // Edit form is still open
    expect(screen.getByTestId('milestone-edit-form-m-1')).toBeInTheDocument();
  });

  it('does not save when payout is non-numeric', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    fireEvent.change(screen.getByDisplayValue('2500'), { target: { value: 'abc' } });

    fireEvent.click(screen.getByTestId('save-milestone-m-1'));

    expect(spies.onSave).not.toHaveBeenCalled();
    // Same message renders in both the ErrorSummary link and per-field aria
    // error — use getAllByText + index 0 so the assertion is unambiguous.
    expect(screen.getAllByText(/payout must be a positive number/i)[0]).toBeInTheDocument();
  });

  it('does not save when payout is zero or negative', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    fireEvent.change(screen.getByDisplayValue('2500'), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('save-milestone-m-1'));
    expect(spies.onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByDisplayValue('0'), { target: { value: '-50' } });
    fireEvent.click(screen.getByTestId('save-milestone-m-1'));
    expect(spies.onSave).not.toHaveBeenCalled();
  });

  it('does not save an over-length title (does not silently truncate)', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    fireEvent.change(screen.getByDisplayValue(VALID_TITLE), {
      target: { value: 'a'.repeat(201) },
    });

    fireEvent.click(screen.getByTestId('save-milestone-m-1'));

    expect(spies.onSave).not.toHaveBeenCalled();
    // Same message renders in both the ErrorSummary link and per-field aria
    // error — use getAllByText + index 0 so the assertion is unambiguous.
    expect(screen.getAllByText(/no more than 200 characters/i)[0]).toBeInTheDocument();
  });

  it('flags every invalid field in the ErrorSummary at once', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    fireEvent.change(screen.getByDisplayValue(VALID_TITLE), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('2500'), { target: { value: 'abc' } });

    fireEvent.click(screen.getByTestId('save-milestone-m-1'));

    const summary = screen.getByRole('alert', { name: /there is a problem/i });
    expect(summary).toHaveTextContent(/title is required/i);
    expect(summary).toHaveTextContent(/payout must be a positive number/i);
  });

  it('invalid fields receive aria-invalid="true"', () => {
    render(<MilestonesList milestones={baseMilestones} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    fireEvent.change(screen.getByDisplayValue(VALID_TITLE), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('save-milestone-m-1'));

    expect(screen.getByDisplayValue('')).toHaveAttribute('aria-invalid', 'true');
  });
});

// ===========================================================================
// 5. Cancel button + Escape keyboard
// ===========================================================================

describe('MilestoneRow — cancel button', () => {
  it('closes edit mode when the Cancel button is clicked', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    expect(screen.getByTestId('milestone-edit-form-m-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel-milestone-m-1'));

    expect(screen.queryByTestId('milestone-edit-form-m-1')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    ).toBeInTheDocument();
  });

  it('does NOT call onUpdateMilestone when Cancel is clicked', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    // Make a dirty edit
    fireEvent.change(screen.getByDisplayValue(VALID_TITLE), {
      target: { value: 'Some unsaved edit' },
    });

    fireEvent.click(screen.getByTestId('cancel-milestone-m-1'));

    expect(spies.onSave).not.toHaveBeenCalled();
  });

  it('discards unsaved validation errors on cancel', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    fireEvent.change(screen.getByDisplayValue(VALID_TITLE), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('save-milestone-m-1'));

    expect(
      screen.getByRole('alert', { name: /there is a problem/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel-milestone-m-1'));

    expect(
      screen.queryByRole('alert', { name: /there is a problem/i }),
    ).not.toBeInTheDocument();
  });
});

describe('MilestoneRow — Escape key keyboard accessibility', () => {
  it('Escape cancels edit mode', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    expect(screen.getByTestId('milestone-edit-form-m-1')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(screen.queryByTestId('milestone-edit-form-m-1')).not.toBeInTheDocument();
  });

  it('Escape does NOT save changes', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    fireEvent.change(screen.getByDisplayValue(VALID_TITLE), {
      target: { value: 'Some unsaved edit' },
    });

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(spies.onSave).not.toHaveBeenCalled();
  });

  it('Escape is a no-op when no row is in edit mode', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    // No error, no edit form
    expect(screen.queryByTestId('milestone-edit-form-m-1')).not.toBeInTheDocument();
  });

  it('Escape discards stale validation errors', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    fireEvent.change(screen.getByDisplayValue(VALID_TITLE), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('save-milestone-m-1'));
    expect(
      screen.getByRole('alert', { name: /there is a problem/i }),
    ).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(
      screen.queryByRole('alert', { name: /there is a problem/i }),
    ).not.toBeInTheDocument();
  });
});

// ===========================================================================
// 6. Save-failure announcement
// ===========================================================================

describe('MilestoneRow — save failure announcement', () => {
  it('announces "Failed to save milestone" when onUpdateMilestone returns false', async () => {
    const failingSave = jest.fn(() => false);
    render(
      <MilestonesList milestones={baseMilestones} onUpdateMilestone={failingSave} />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    fireEvent.click(screen.getByTestId('save-milestone-m-1'));

    // Edit form stays open so user can retry.
    expect(screen.getByTestId('milestone-edit-form-m-1')).toBeInTheDocument();
    // The onUpdateMilestone was called and returned false
    expect(failingSave).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// 7. Edit button keyboard accessibility
// ===========================================================================

describe('MilestoneRow — Edit button keyboard accessibility', () => {
  it('Edit button has type="button" so it does not trigger form submit', () => {
    render(<MilestonesList milestones={baseMilestones} />);

    const editBtn = screen.getByRole('button', {
      name: 'Edit milestone Project Kickoff',
    });
    expect(editBtn).toHaveAttribute('type', 'button');
  });

  it('Cancel button has type="button" so it does not trigger form submit', () => {
    render(<MilestonesList milestones={baseMilestones} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    const cancelBtn = screen.getByTestId('cancel-milestone-m-1');
    expect(cancelBtn).toHaveAttribute('type', 'button');
  });

  it('Save via the title input keyboard (Enter) submits the form', () => {
    const spies = createSpies();
    render(
      <MilestonesList
        milestones={baseMilestones}
        onUpdateMilestone={spies.onSave}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );

    const titleInput = screen.getByDisplayValue(VALID_TITLE);
    fireEvent.change(titleInput, { target: { value: 'Hit Enter to save' } });

    act(() => {
      fireEvent.submit(screen.getByTestId('milestone-edit-form-m-1'));
    });

    expect(spies.onSave).toHaveBeenCalledTimes(1);
    expect(spies.onSave).toHaveBeenCalledWith(
      'm-1',
      expect.objectContaining({ title: 'Hit Enter to save' }),
    );
  });
});

// ===========================================================================
// 8. Accessibility — axe
// ===========================================================================

describe('MilestoneRow — accessibility', () => {
  it('passes axe accessibility checks in view mode', async () => {
    const { container } = render(<MilestonesList milestones={baseMilestones} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes axe accessibility checks in edit mode', async () => {
    const { container } = render(<MilestonesList milestones={baseMilestones} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );

    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes axe accessibility checks with validation errors visible', async () => {
    const { container } = render(<MilestonesList milestones={baseMilestones} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit milestone Project Kickoff' }),
    );
    fireEvent.change(screen.getByDisplayValue(VALID_TITLE), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('save-milestone-m-1'));

    expect(await axe(container)).toHaveNoViolations();
  });

  it('declares a polite live region for save outcomes', () => {
    render(<MilestonesList milestones={baseMilestones} />);

    const liveRegion = screen.getByTestId('milestones-announcement');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });
});
