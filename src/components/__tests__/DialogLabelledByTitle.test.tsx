/**
 * Issue #502 — "Announce the dialog title on open via aria-labelledby".
 *
 * These tests assert the accessibility guarantee documented in
 * docs/components/Dialogs.md: every modal dialog exposes a programmatic name
 * by wiring `aria-labelledby` to a stable id on its visible (or sr-only) title
 * element, so assistive technology announces the dialog's purpose on open.
 *
 * Scope note: this suite is verification-only — it does not modify any dialog
 * component. It covers all shared dialog surfaces plus the two edge cases the
 * issue calls out (a dialog without a *visible* title, and nested dialogs).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { axe } from 'jest-axe';

import { ConfirmDialog } from '../ConfirmDialog';
import { ContractCreationForm } from '../ContractCreationForm';
import CreateContractForm from '../contracts/CreateContractForm';
import { MilestoneCreationForm } from '../milestones/MilestoneCreationForm';
import { SettingsPanel } from '../settings/SettingsPanel';
import CommandPalette from '../CommandPalette';
import { PreferencesProvider } from '@/lib/preferences';
import { resetCache } from '@/lib/safeStorage';

// Toast is a cross-cutting concern several dialogs consume; stub it so the
// dialogs render in isolation without a real ToastProvider ancestor.
jest.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showInfo: jest.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const noop = () => {};

/**
 * Core assertion for this issue: the dialog carries an `aria-labelledby` that
 * resolves to exactly one element in the document whose text is the dialog's
 * title.
 */
function expectLabelledByItsTitle(dialog: HTMLElement, expectedTitle: string) {
  const labelId = dialog.getAttribute('aria-labelledby');
  expect(labelId).toBeTruthy();

  // The referenced id must be unique — a duplicate would make the
  // announced name ambiguous (the "stable id" requirement).
  expect(document.querySelectorAll(`[id="${labelId}"]`)).toHaveLength(1);

  const titleEl = document.getElementById(labelId as string);
  expect(titleEl).not.toBeNull();
  expect(titleEl?.textContent?.trim()).toBe(expectedTitle);
}

/** Wrap UI in a minimal page shell so axe has landmarks/heading to scan. */
function pageShell(ui: React.ReactElement) {
  return (
    <div>
      <main>
        <h1>Page content</h1>
        <p>Background content that should be inert while a dialog is open.</p>
      </main>
      {ui}
    </div>
  );
}

describe('dialog is labelled by its title', () => {
  beforeEach(() => {
    localStorage.clear();
    resetCache();
  });

  describe('each shared dialog exposes an accessible name via aria-labelledby', () => {
    it('ConfirmDialog (role="dialog") is named by its title', () => {
      render(
        <ConfirmDialog
          isOpen
          title="Release funds"
          description="Funds will be transferred immediately."
          onConfirm={noop}
          onCancel={noop}
        />,
      );

      const dialog = screen.getByRole('dialog', { name: 'Release funds' });
      expectLabelledByItsTitle(dialog, 'Release funds');
    });

    it('ConfirmDialog (role="alertdialog", destructive) is named by its title', () => {
      render(
        <ConfirmDialog
          isOpen
          tone="destructive"
          title="Delete contract"
          description="This permanently removes the contract."
          onConfirm={noop}
          onCancel={noop}
        />,
      );

      const dialog = screen.getByRole('alertdialog', { name: 'Delete contract' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expectLabelledByItsTitle(dialog, 'Delete contract');
    });

    it('ContractCreationForm is named by its heading', () => {
      render(<ContractCreationForm onSubmit={noop} onCancel={noop} />);

      const dialog = screen.getByRole('dialog', { name: 'Create New Contract' });
      expectLabelledByItsTitle(dialog, 'Create New Contract');
    });

    it('CreateContractForm (contracts) is named by its heading', () => {
      render(<CreateContractForm onSuccess={noop} onCancel={noop} />);

      const dialog = screen.getByRole('dialog', { name: 'Create a new contract' });
      expectLabelledByItsTitle(dialog, 'Create a new contract');
    });

    it('MilestoneCreationForm is named by its heading (not the matching submit button)', () => {
      render(<MilestoneCreationForm onSubmit={noop} onCancel={noop} />);

      const dialog = screen.getByRole('dialog', { name: 'Add Milestone' });
      expectLabelledByItsTitle(dialog, 'Add Milestone');
      // The label must point at the <h2>, even though "Add Milestone" also
      // appears as the submit button's text.
      const titleEl = document.getElementById(dialog.getAttribute('aria-labelledby') as string);
      expect(titleEl?.tagName).toBe('H2');
    });

    it('SettingsPanel drawer is named by its heading', () => {
      render(
        <PreferencesProvider>
          <SettingsPanel isOpen onClose={noop} />
        </PreferencesProvider>,
      );

      const dialog = screen.getByRole('dialog', { name: 'Settings' });
      expectLabelledByItsTitle(dialog, 'Settings');
    });
  });

  describe('edge case — dialog without a visible title', () => {
    it('CommandPalette is still announced via an sr-only title', async () => {
      const user = userEvent.setup();
      render(<CommandPalette />);

      await user.click(screen.getByRole('button', { name: /open command palette/i }));

      const dialog = screen.getByRole('dialog', { name: 'Command palette' });
      expectLabelledByItsTitle(dialog, 'Command palette');

      // The title carries a name for AT but is visually hidden — proving a
      // dialog with no *visible* title is still programmatically named.
      const titleEl = document.getElementById(dialog.getAttribute('aria-labelledby') as string);
      expect(titleEl).toHaveClass('sr-only');
    });
  });

  describe('edge case — nested / simultaneously mounted dialogs', () => {
    it('two different dialogs each resolve to their own distinct title', () => {
      render(
        <>
          <ContractCreationForm onSubmit={noop} onCancel={noop} />
          <MilestoneCreationForm onSubmit={noop} onCancel={noop} />
        </>,
      );

      const contract = screen.getByRole('dialog', { name: 'Create New Contract' });
      const milestone = screen.getByRole('dialog', { name: 'Add Milestone' });

      expectLabelledByItsTitle(contract, 'Create New Contract');
      expectLabelledByItsTitle(milestone, 'Add Milestone');

      // Each dialog points at a *different* label id — no cross-contamination.
      expect(contract.getAttribute('aria-labelledby')).not.toBe(
        milestone.getAttribute('aria-labelledby'),
      );
    });

    it('stacked ConfirmDialogs get stable, unique label ids via useId', () => {
      const { container } = render(
        <>
          <ConfirmDialog
            isOpen
            title="First confirm"
            description="Base layer."
            onConfirm={noop}
            onCancel={noop}
          />
          <ConfirmDialog
            isOpen
            title="Second confirm"
            description="Stacked on top."
            onConfirm={noop}
            onCancel={noop}
          />
        </>,
      );

      // Query the DOM directly: the topmost ConfirmDialog marks background
      // siblings inert/aria-hidden, so role-based queries would only surface
      // one. We still expect both to be correctly labelled in the DOM.
      const dialogEls = Array.from(
        container.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]'),
      );
      expect(dialogEls).toHaveLength(2);

      const [firstId, secondId] = dialogEls.map((d) => d.getAttribute('aria-labelledby'));
      expect(firstId).toBeTruthy();
      expect(secondId).toBeTruthy();
      expect(firstId).not.toBe(secondId);

      expect(document.getElementById(firstId as string)?.textContent?.trim()).toBe('First confirm');
      expect(document.getElementById(secondId as string)?.textContent?.trim()).toBe('Second confirm');
    });
  });

  describe('label ids are stable and unique per dialog instance', () => {
    it('form dialog with a static id renders that id exactly once', () => {
      render(<ContractCreationForm onSubmit={noop} onCancel={noop} />);
      expect(document.querySelectorAll('[id="create-contract-title"]')).toHaveLength(1);
    });
  });

  describe('a11y — no accessible-name violations', () => {
    it('ConfirmDialog default has no axe violations', async () => {
      const { container } = render(
        pageShell(
          <ConfirmDialog
            isOpen
            title="Confirm action"
            description="Are you sure you want to proceed?"
            onConfirm={noop}
            onCancel={noop}
          />,
        ),
      );
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('ConfirmDialog destructive has no axe violations', async () => {
      const { container } = render(
        pageShell(
          <ConfirmDialog
            isOpen
            tone="destructive"
            title="Delete item"
            description="This action cannot be undone."
            onConfirm={noop}
            onCancel={noop}
          />,
        ),
      );
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });
});
