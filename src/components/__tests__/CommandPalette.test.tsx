import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import CommandPalette from '../CommandPalette';
import { clearCommands, registerCommand } from '@/lib/commands/registry';

expect.extend(toHaveNoViolations);

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn() }),
}));

beforeEach(() => {
  clearCommands();
  registerCommand({
    id: 'nav-milestones',
    label: 'Go to Milestones',
    keywords: ['milestones', 'milestone', 'payments', 'payouts'],
    href: '/milestones',
  });
  mockPush.mockClear();
});

afterEach(() => {
  clearCommands();
});

const openPalette = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /open command palette/i }));
  return user;
};

describe('CommandPalette — trigger', () => {
  it('renders a visible trigger button', () => {
    render(<CommandPalette />);
    expect(screen.getByRole('button', { name: /open command palette/i })).toBeInTheDocument();
  });

  it('is closed by default', () => {
    render(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the dialog when the trigger is clicked', async () => {
    render(<CommandPalette />);
    await openPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('CommandPalette — keyboard shortcut', () => {
  it('opens on Ctrl+K from anywhere in the document', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens on Cmd+K (metaKey)', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('toggles closed on a second Ctrl+K', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('CommandPalette — milestones registration', () => {
  it('lists the milestones command once open', async () => {
    render(<CommandPalette />);
    await openPalette();
    expect(screen.getByRole('option', { name: 'Go to Milestones' })).toBeInTheDocument();
  });

  it('does not render duplicate milestones entries', async () => {
    render(<CommandPalette />);
    await openPalette();
    expect(screen.getAllByRole('option', { name: 'Go to Milestones' })).toHaveLength(1);
  });

  it('filters the milestones entry in by keyword match', async () => {
    render(<CommandPalette />);
    const user = await openPalette();
    await user.type(screen.getByRole('combobox'), 'payouts');
    expect(screen.getByRole('option', { name: 'Go to Milestones' })).toBeInTheDocument();
  });

  it('filters the milestones entry out when the query does not match', async () => {
    render(<CommandPalette />);
    const user = await openPalette();
    await user.type(screen.getByRole('combobox'), 'zzz-no-match');
    expect(screen.queryByRole('option', { name: 'Go to Milestones' })).not.toBeInTheDocument();
    expect(screen.getByText('No matching commands')).toBeInTheDocument();
  });
});

describe('CommandPalette — activation', () => {
  it('navigates to /milestones and closes when the milestones option is clicked', async () => {
    render(<CommandPalette />);
    await openPalette();

    fireEvent.click(screen.getByRole('option', { name: 'Go to Milestones' }));

    expect(mockPush).toHaveBeenCalledWith('/milestones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates to /milestones when Enter is pressed on the highlighted option', async () => {
    render(<CommandPalette />);
    const user = await openPalette();

    await user.keyboard('{Enter}');

    expect(mockPush).toHaveBeenCalledWith('/milestones');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves the active option with ArrowDown/ArrowUp before activating', async () => {
    registerCommand({
      id: 'nav-contracts',
      label: 'Go to Contracts',
      keywords: ['contracts'],
      href: '/contracts',
    });

    render(<CommandPalette />);
    const user = await openPalette();

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(mockPush).toHaveBeenCalledWith('/contracts');
  });

  it('returns focus to the trigger button after closing', async () => {
    render(<CommandPalette />);
    await openPalette();

    fireEvent.click(screen.getByRole('option', { name: 'Go to Milestones' }));

    expect(await screen.findByRole('button', { name: /open command palette/i })).toHaveFocus();
  });
});

describe('CommandPalette — keyboard dismissal', () => {
  it('closes on Escape', async () => {
    render(<CommandPalette />);
    await openPalette();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when the backdrop is clicked', async () => {
    render(<CommandPalette />);
    await openPalette();

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.previousElementSibling as Element);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('CommandPalette — accessibility (jest-axe)', () => {
  it('has no axe violations when closed', async () => {
    const { container } = render(<CommandPalette />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when open', async () => {
    const { container } = render(<CommandPalette />);
    await openPalette();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
