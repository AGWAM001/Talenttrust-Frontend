'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Navigation route definitions for the primary global nav.
 * @internal
 */
const NAV_ROUTES = [
  { href: '/contracts', label: 'Contracts' },
  { href: '/milestones', label: 'Milestones' },
  { href: '/reputation', label: 'Reputation' },
  { href: '/wallet', label: 'Wallet' },
] as const;

/**
 * Navbar — accessible primary navigation for the TalentTrust application.
 *
 * Renders persistent links to /contracts, /milestones, and /reputation.
 * The active route is determined via `usePathname` and announced to
 * assistive technology through `aria-current="page"`. Inactive routes
 * are styled with subdued foreground color to reduce visual noise.
 *
 * @remarks
 * - This component is marked `'use client'` because it consumes
 *   `usePathname` from `next/navigation`.
 * - Focus rings and color tokens inherit from `globals.css` CSS custom
 *   properties to remain consistent with the existing design system.
 * - On narrow viewports the links wrap naturally via flex-wrap; no
 *   hamburger menu is used to avoid hidden-focus management complexity.
 *
 * @example
 * // In src/app/layout.tsx
 * <header className="sticky top-0 z-40 ...">
 *   <span className="brand">TalentTrust</span>
 *   <Navbar />
 *   <WalletConnectButton />
 * </header>
 */
export default function Navbar(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary">
      <ul className="flex flex-wrap items-center gap-1 sm:gap-2">
        {NAV_ROUTES.map(({ href, label }) => {
          const isActive = pathname === href;

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1',
                  isActive
                    ? 'text-[var(--primary)] bg-[var(--primary)]/10'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]',
                ].join(' ')}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}