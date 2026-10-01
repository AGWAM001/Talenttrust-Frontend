import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import MilestonesList from '../MilestonesList';
import type { Milestone } from '../MilestonesList';

// ---------------------------------------------------------------------------
// Roving tabindex keyboard navigation (issue #1106)
//
// The milestone list exposes a single tab stop: exactly one row (the "active"
// row) carries tabIndex={0} while every other row carries tabIndex={-1}.
// Arrow keys rove focus between rows, Home/End jump to the first/last row,
// and Enter/Space activate the focused row (open its inline edit form).
//
// All fixture due dates are fixed in the past so the due-soon reminder banner
// (computed from `new Date()` at render time) never leaks into these tests.
// ---------------------------------------------------------------------------

const THREE: Milestone[] = [
  { id: 'm1', title: 'Milestone One', status: 'Pending', payout: 100, currency: 'USD', dueDate: '2025-01-01' },
  { id: 'm2', title: 'Milestone Two', status: 'Active', payout: 200, currency: 'USD', dueDate: '2025-01-02' },
  { id: 'm3', title: 'Milestone Three', status: 'Completed', payout: 300, currency: 'USD', dueDate: '2025-01-03' },
];

const row = (name: string) => screen.getByRole('article', { name });

const editButtons = () =>
  screen.getAllByRole('button', { name: /edit milestone/i });

describe('MilestonesList – roving tabindex keyboard navigation', () => {
  describe('tab order / tabindex management', () => {
    it('enters the list at exactly one item when Tab is pressed', async () => {
      const user = userEvent.setup();
      render(<MilestonesList milestones={THREE} />);

      // The control immediately before the list in the tab order is the
      // "Select all" checkbox. Tabbing from it must land on the active (first)
      // milestone row — the list's single tab stop.
      screen.getByRole('checkbox', { name: /select all milestones/i }).focus();
      await user.tab();

      expect(document.activeElement).toBe(row('Milestone One'));
    });

    it('gives tabIndex={0} to the active row only and tabIndex={-1} to every other row', () => {
      const { container } = render(<MilestonesList milestones={THREE} />);

      const articles = Array.from(
        container.querySelectorAll<HTMLElement>('article'),
      );
      expect(articles).toHaveLength(3);
      expect(articles[0]).toHaveAttribute('tabindex', '0');
      expect(articles[1]).toHaveAttribute('tabindex', '-1');
      expect(articles[2]).toHaveAttribute('tabindex', '-1');

      // The active row's inner controls stay reachable; inactive rows'
      // controls are pulled out of the tab order too.
      expect(screen.getByRole('button', { name: 'Edit milestone Milestone One' })).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('checkbox', { name: /select milestone one/i })).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('button', { name: 'Edit milestone Milestone Two' })).toHaveAttribute('tabindex', '-1');
      expect(screen.getByRole('checkbox', { name: /select milestone two/i })).toHaveAttribute('tabindex', '-1');
    });

    it('pulls inactive rows out of the tab order when tabbing past the active row', async () => {
      const user = userEvent.setup();
      render(<MilestonesList milestones={THREE} />);

      // Start on the active row's Edit button and Tab repeatedly. The next
      // stops are the active row's checkbox/Edit button only — focus must
      // never land on row 2/3 (they are not in the tab order).
      const editBtn = screen.getByRole('button', { name: 'Edit milestone Milestone One' });
      editBtn.focus();
      await user.tab();

      const active = document.activeElement;
      const landedOnInactiveRow =
        active === screen.getByRole('button', { name: 'Edit milestone Milestone Two' }) ||
        active === screen.getByRole('button', { name: 'Edit milestone Milestone Three' }) ||
        active === screen.getByRole('checkbox', { name: /select milestone two/i }) ||
        active === screen.getByRole('checkbox', { name: /select milestone three/i });
      expect(landedOnInactiveRow).toBe(false);
    });

    it('keeps the scroll region out of the tab order (it is not the list tab stop)', () => {
      const { container } = render(<MilestonesList milestones={THREE} />);
      const region = container.querySelector('[role="region"]');
      expect(region).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('arrow key navigation', () => {
    it('moves focus down with ArrowDown and updates the active row', async () => {
      const user = userEvent.setup();
      render(<MilestonesList milestones={THREE} />);

      row('Milestone One').focus();
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(row('Milestone Two'));

      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(row('Milestone Three'));

      // The newly focused row becomes the single tab stop.
      expect(row('Milestone Two')).toHaveAttribute('tabindex', '-1');
      expect(row('Milestone Three')).toHaveAttribute('tabindex', '0');
    });

    it('moves focus up with ArrowUp', async () => {
      const user = userEvent.setup();
      render(<MilestonesList milestones={THREE} />);

      row('Milestone Three').focus();
      await user.keyboard('{ArrowUp}');
      expect(document.activeElement).toBe(row('Milestone Two'));

      await user.keyboard('{ArrowUp}');
      expect(document.activeElement).toBe(row('Milestone One'));
    });

    it('does not wrap around at the list boundaries', async () => {
      const user = userEvent.setup();
      render(<MilestonesList milestones={THREE} />);

      row('Milestone One').focus();
      await user.keyboard('{ArrowUp}');
      expect(document.activeElement).toBe(row('Milestone One'));

      row('Milestone Three').focus();
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(row('Milestone Three'));
    });

    it('does not rove when focus is on an inner control (checkbox)', async () => {
      const user = userEvent.setup();
      render(<MilestonesList milestones={THREE} />);

      const cb = screen.getByRole('checkbox', { name: /select milestone two/i });
      cb.focus();
      await user.keyboard('{ArrowDown}');

      expect(document.activeElement).toBe(cb);
      expect(screen.getByRole('article', { name: 'Milestone Three' })).not.toHaveFocus();
    });
  });

  describe('Home / End', () => {
    it('jumps to the first row with Home', async () => {
      const user = userEvent.setup();
      render(<MilestonesList milestones={THREE} />);

      row('Milestone Three').focus();
      await user.keyboard('{Home}');
      expect(document.activeElement).toBe(row('Milestone One'));
    });

    it('jumps to the last row with End', async () => {
      const user = userEvent.setup();
      render(<MilestonesList milestones={THREE} />);

      row('Milestone One').focus();
      await user.keyboard('{End}');
      expect(document.activeElement).toBe(row('Milestone Three'));
    });
  });

  describe('Enter / Space activation', () => {
    it('activates the focused row with Enter (opens its inline edit form)', async () => {
      const user = userEvent.setup();
      render(<MilestonesList milestones={THREE} />);

      row('Milestone Two').focus();
      await user.keyboard('{Enter}');

      expect(screen.getByTestId('milestone-edit-form-m2')).toBeInTheDocument();
      // Only the focused row entered edit mode.
      expect(screen.queryByTestId('milestone-edit-form-m1')).not.toBeInTheDocument();
    });

    it('activates the focused row with Space', async () => {
      const user = userEvent.setup();
      render(<MilestonesList milestones={THREE} />);

      row('Milestone One').focus();
      await user.keyboard(' ');

      expect(screen.getByTestId('milestone-edit-form-m1')).toBeInTheDocument();
    });

    it('does not double-activate when Enter is pressed on a row checkbox', async () => {
      const user = userEvent.setup();
      render(<MilestonesList milestones={THREE} />);

      const cb = screen.getByRole('checkbox', { name: /select milestone two/i });
      cb.focus();
      await user.keyboard('{Enter}');

      // The checkbox's own Enter handler toggles selection; the roving
      // handler must not ALSO open edit mode for the row.
      expect(cb).toBeChecked();
      expect(screen.queryByTestId('milestone-edit-form-m2')).not.toBeInTheDocument();
    });
  });

  describe('focus visibility', () => {
    it('keeps a visible focus ring on every row', () => {
      render(<MilestonesList milestones={THREE} />);

      for (const m of THREE) {
        const article = row(m.title);
        expect(article).toHaveClass(
          'focus-visible:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-indigo-500',
          'focus-visible:ring-offset-2',
        );
      }
    });
  });

  describe('keeping focus in sync when the list changes', () => {
    it('restores focus to the clamped active row when the focused row is removed', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<MilestonesList milestones={THREE} />);

      // Rove to the last row.
      row('Milestone Three').focus();
      await user.keyboard('{Home}');
      await user.keyboard('{End}');
      expect(document.activeElement).toBe(row('Milestone Three'));

      // The list shrinks (e.g. status filter) and the focused row disappears.
      rerender(<MilestonesList milestones={THREE.slice(0, 2)} />);

      await waitFor(() => {
        expect(document.activeElement).toBe(row('Milestone Two'));
      });
      // Exactly one row is the tab stop again, at the clamped index.
      expect(row('Milestone Two')).toHaveAttribute('tabindex', '0');
      expect(row('Milestone One')).toHaveAttribute('tabindex', '-1');
    });

    it('clamps the active index when the list shrinks', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<MilestonesList milestones={THREE} />);

      row('Milestone Three').focus();
      await user.keyboard('{End}');

      rerender(<MilestonesList milestones={THREE.slice(0, 1)} />);

      await waitFor(() => {
        expect(row('Milestone One')).toHaveAttribute('tabindex', '0');
      });
    });

    it('does not move focus into the list when the list changes but focus is elsewhere', () => {
      const { rerender } = render(<MilestonesList milestones={THREE} />);

      const densityToggle = screen.getByRole('button', {
        name: /switch to compact density/i,
      });
      densityToggle.focus();

      rerender(<MilestonesList milestones={THREE.slice(0, 2)} />);

      expect(document.activeElement).toBe(densityToggle);
    });
  });

  describe('accessibility', () => {
    it('passes axe checks with the roving tabindex state active', async () => {
      const user = userEvent.setup();
      const { container } = render(<MilestonesList milestones={THREE} />);

      row('Milestone One').focus();
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{End}');

      expect(await axe(container)).toHaveNoViolations();
    });

    it('keeps every Edit button and checkbox reachable by keyboard via the active row', async () => {
      render(<MilestonesList milestones={THREE} />);
      // All controls exist; the roving pattern makes them reachable by
      // roving to their row first (tabindex stays -1 only for inactive rows).
      expect(editButtons()).toHaveLength(3);
      expect(screen.getAllByRole('checkbox')).toHaveLength(4); // 3 rows + select all
    });
  });
});
