import { registerCommand } from './registry';

/**
 * Registers the palette entries available on every page. Imported once
 * for its side effect from the root layout.
 */
export function registerDefaultCommands(): void {
  registerCommand({
    id: 'nav-milestones',
    label: 'Go to Milestones',
    keywords: ['milestones', 'milestone', 'payments', 'payouts'],
    href: '/milestones',
  });
}
