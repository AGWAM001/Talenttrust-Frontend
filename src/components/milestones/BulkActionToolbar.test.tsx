import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { BulkActionToolbar } from './BulkActionToolbar';

const defaultProps = {
  selectedCount: 0,
  totalCount: 5,
  onClearSelection: jest.fn(),
  onExport: jest.fn(),
  onStatusUpdate: jest.fn(),
  onDelete: jest.fn(),
};

describe('BulkActionToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility', () => {
    it('renders nothing when selectedCount is zero', () => {
      const { container } = render(<BulkActionToolbar {...defaultProps} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders the toolbar when at least one item is selected', () => {
      render(<BulkActionToolbar {...defaultProps} selectedCount={2} />);

      expect(screen.getByRole('toolbar')).toBeInTheDocument();
      expect(screen.getByText(/2 of 5 items selected/i)).toBeInTheDocument();
    });

    it('uses correct singular form when 1 item is selected', () => {
      render(<BulkActionToolbar {...defaultProps} selectedCount={1} totalCount={1} />);

      expect(screen.getByText(/1 of 1 item selected/i)).toBeInTheDocument();
    });
  });

  describe('role and labelling (a11y)', () => {
    it('uses role="toolbar" and provides an accessible name', () => {
      render(<BulkActionToolbar {...defaultProps} selectedCount={3} />);

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toBeInTheDocument();
      expect(toolbar).toHaveAttribute('aria-label', 'Bulk milestone actions');
      expect(toolbar).toHaveAttribute('aria-labelledby');
    });

    it('passes axe accessibility checks when visible', async () => {
      const { container } = render(
        <BulkActionToolbar {...defaultProps} selectedCount={2} />
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('Clear button', () => {
    it('fires onClearSelection when clicked', async () => {
      const user = userEvent.setup();
      const onClearSelection = jest.fn();

      render(
        <BulkActionToolbar
          {...defaultProps}
          selectedCount={2}
          onClearSelection={onClearSelection}
        />
      );

      await user.click(screen.getByRole('button', { name: /clear selection/i }));
      expect(onClearSelection).toHaveBeenCalledTimes(1);
    });

    it('has accessible aria-label', () => {
      render(<BulkActionToolbar {...defaultProps} selectedCount={2} />);

      expect(
        screen.getByRole('button', { name: /clear selection/i })
      ).toBeInTheDocument();
    });
  });

  describe('Export button', () => {
    it('fires onExport with correct accessible label', async () => {
      const user = userEvent.setup();
      const onExport = jest.fn();

      render(
        <BulkActionToolbar
          {...defaultProps}
          selectedCount={3}
          onExport={onExport}
        />
      );

      await user.click(screen.getByRole('button', { name: /export 3 selected milestones/i }));
      expect(onExport).toHaveBeenCalledTimes(1);
    });

    it('uses singular aria-label for 1 selected item', () => {
      render(<BulkActionToolbar {...defaultProps} selectedCount={1} />);

      expect(
        screen.getByRole('button', { name: /export 1 selected milestone/i })
      ).toBeInTheDocument();
    });
  });

  describe('Delete button', () => {
    it('fires onDelete when clicked', async () => {
      const user = userEvent.setup();
      const onDelete = jest.fn();

      render(
        <BulkActionToolbar
          {...defaultProps}
          selectedCount={2}
          onDelete={onDelete}
        />
      );

      await user.click(screen.getByRole('button', { name: /delete 2 selected/i }));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('uses singular aria-label for 1 selected item', () => {
      render(<BulkActionToolbar {...defaultProps} selectedCount={1} />);

      expect(
        screen.getByRole('button', { name: /delete 1 selected milestone/i })
      ).toBeInTheDocument();
    });
  });

  describe('Status update select', () => {
    it('fires onStatusUpdate with the chosen status value and resets', async () => {
      const user = userEvent.setup();
      const onStatusUpdate = jest.fn();

      render(
        <BulkActionToolbar
          {...defaultProps}
          selectedCount={2}
          onStatusUpdate={onStatusUpdate}
        />
      );

      const select = screen.getByRole('combobox', {
        name: /change status of selected milestones/i,
      }) as HTMLSelectElement;

      await user.selectOptions(select, 'Completed');

      expect(onStatusUpdate).toHaveBeenCalledTimes(1);
      expect(onStatusUpdate).toHaveBeenCalledWith('Completed');
      expect(select.value).toBe('');
    });

    it('offers every standard status option', () => {
      render(<BulkActionToolbar {...defaultProps} selectedCount={2} />);

      const options = screen.getAllByRole('option');
      const labels = options.map((o) => o.textContent);

      expect(labels).toContain('Pending');
      expect(labels).toContain('Active');
      expect(labels).toContain('Completed');
      expect(labels).toContain('Paid');
      expect(labels).toContain('Disputed');
    });

    it('has an associated sr-only label linked via htmlFor', () => {
      const { container } = render(
        <BulkActionToolbar {...defaultProps} selectedCount={2} />
      );

      const select = screen.getByRole('combobox', {
        name: /change status of selected milestones/i,
      });
      expect(select).toHaveAttribute('id', 'bulk-status-select');

      const label = container.querySelector('label[for="bulk-status-select"]');
      expect(label).toBeInTheDocument();
      expect(label).toHaveClass('sr-only');
    });
  });

  describe('Keyboard behaviour', () => {
    it('clears the selection when Escape is pressed', async () => {
      const user = userEvent.setup();
      const onClearSelection = jest.fn();

      render(
        <BulkActionToolbar
          {...defaultProps}
          selectedCount={2}
          onClearSelection={onClearSelection}
        />
      );

      await user.keyboard('{Escape}');
      expect(onClearSelection).toHaveBeenCalledTimes(1);
    });

    it('does nothing with Escape when toolbar is hidden (selectedCount=0)', async () => {
      const user = userEvent.setup();
      const onClearSelection = jest.fn();

      render(
        <BulkActionToolbar
          {...defaultProps}
          selectedCount={0}
          onClearSelection={onClearSelection}
        />
      );

      await user.keyboard('{Escape}');
      expect(onClearSelection).not.toHaveBeenCalled();
    });

    it('navigates forward within toolbar with ArrowRight and wraps', async () => {
      const user = userEvent.setup();

      render(<BulkActionToolbar {...defaultProps} selectedCount={2} />);

      const focusables = Array.from(
        screen
          .getByRole('toolbar')
          .querySelectorAll<HTMLElement>(
            'button:not([disabled]), select:not([disabled])'
          )
      );
      const last = focusables[focusables.length - 1];
      const first = focusables[0];

      last.focus();
      expect(document.activeElement).toBe(last);

      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(first);
    });

    it('navigates backward within toolbar with ArrowLeft and wraps', async () => {
      const user = userEvent.setup();

      render(<BulkActionToolbar {...defaultProps} selectedCount={2} />);

      const focusables = Array.from(
        screen
          .getByRole('toolbar')
          .querySelectorAll<HTMLElement>(
            'button:not([disabled]), select:not([disabled])'
          )
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      first.focus();
      expect(document.activeElement).toBe(first);

      await user.keyboard('{ArrowLeft}');
      expect(document.activeElement).toBe(last);
    });

    it('navigates forward within toolbar with ArrowDown and wraps', async () => {
      const user = userEvent.setup();

      render(<BulkActionToolbar {...defaultProps} selectedCount={2} />);

      const focusables = Array.from(
        screen
          .getByRole('toolbar')
          .querySelectorAll<HTMLElement>(
            'button:not([disabled]), select:not([disabled])'
          )
      );
      const last = focusables[focusables.length - 1];
      const first = focusables[0];

      last.focus();
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(first);
    });

    it('navigates backward within toolbar with ArrowUp and wraps', async () => {
      const user = userEvent.setup();

      render(<BulkActionToolbar {...defaultProps} selectedCount={2} />);

      const focusables = Array.from(
        screen
          .getByRole('toolbar')
          .querySelectorAll<HTMLElement>(
            'button:not([disabled]), select:not([disabled])'
          )
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      first.focus();
      await user.keyboard('{ArrowUp}');
      expect(document.activeElement).toBe(last);
    });

    it('moves focus to first focusable with Home key', async () => {
      const user = userEvent.setup();

      render(<BulkActionToolbar {...defaultProps} selectedCount={2} />);

      const focusables = Array.from(
        screen
          .getByRole('toolbar')
          .querySelectorAll<HTMLElement>(
            'button:not([disabled]), select:not([disabled])'
          )
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      last.focus();
      await user.keyboard('{Home}');
      expect(document.activeElement).toBe(first);
    });

    it('moves focus to last focusable with End key', async () => {
      const user = userEvent.setup();

      render(<BulkActionToolbar {...defaultProps} selectedCount={2} />);

      const focusables = Array.from(
        screen
          .getByRole('toolbar')
          .querySelectorAll<HTMLElement>(
            'button:not([disabled]), select:not([disabled])'
          )
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      first.focus();
      await user.keyboard('{End}');
      expect(document.activeElement).toBe(last);
    });

    it('does not navigate with Arrow keys when focus is outside the toolbar', async () => {
      const user = userEvent.setup();

      render(<BulkActionToolbar {...defaultProps} selectedCount={2} />);

      const focusables = Array.from(
        screen
          .getByRole('toolbar')
          .querySelectorAll<HTMLElement>(
            'button:not([disabled]), select:not([disabled])'
          )
      );
      const first = focusables[0];

      document.body.focus();
      expect(document.activeElement).not.toBe(first);

      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).not.toBe(first);
    });
  });

  describe('Focus management on open', () => {
    it('moves focus to the Clear button when selection transitions from 0 to > 0', async () => {
      const user = userEvent.setup();

      const { rerender } = render(<BulkActionToolbar {...defaultProps} />);
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();

      rerender(<BulkActionToolbar {...defaultProps} selectedCount={2} />);

      const clearBtn = screen.getByRole('button', { name: /clear selection/i });
      expect(document.activeElement).toBe(clearBtn);
      void user;
    });
  });

  describe('ARIA live region for count', () => {
    it('exposes the selected count via aria-live="polite"', () => {
      render(<BulkActionToolbar {...defaultProps} selectedCount={2} />);

      const countEl = screen.getByText(/2 of 5 items selected/i);
      expect(countEl).toHaveAttribute('aria-live', 'polite');
      expect(countEl).toHaveAttribute('aria-atomic', 'true');
    });
  });
});
