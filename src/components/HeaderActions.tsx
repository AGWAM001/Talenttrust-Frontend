'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import SafeBoundary from '@/components/SafeBoundary';

/**
 * HeaderActions — responsive header action wrapper.
 *
 * This component keeps the global header fully fluid on narrow viewports
 * by collapsing wallet-related actions behind an accessible disclosure
 * control below the `sm` breakpoint.
 *
 * On larger screens it preserves the existing inline layout for the
 * `WalletConnectButton` while still rendering a keyboard-accessible toggle
 * for mobile users.
 *
 * Focus management:
 * - When the toggle opens, focus moves to the first interactive element
 *   inside the revealed panel so keyboard users can immediately operate
 *   the wallet controls.
 * - When the panel closes, focus is restored to the toggle button.
 */
export default function HeaderActions(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = 'header-wallet-actions';
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isOpen) {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    } else {
      // Panel just closed — restore focus to toggle button
      // Use longer timeout to ensure DOM has settled
      setTimeout(() => {
        if (toggleRef.current && document.contains(toggleRef.current)) {
          toggleRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((current) => !current);
  };

  return (
    <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:min-w-0">
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={isOpen ? 'true' : 'false'}
          aria-controls={menuId}
          onClick={handleToggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white sm:hidden"
        >
          <span className="sr-only">
            {isOpen ? 'Close wallet actions' : 'Open wallet actions'}
          </span>
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 7h16M4 12h16M4 17h16'} />
          </svg>
        </button>
      </div>

      <div
        id={menuId}
        ref={panelRef}
        role="region"
        aria-label="Wallet actions"
        className={[
          isOpen ? 'block' : 'hidden',
          'w-full max-w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:block sm:w-auto sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none',
        ].join(' ')}
      >
        <div className="flex w-full min-w-0 justify-end sm:w-auto">
          <SafeBoundary fallbackTitle="Wallet section failed to load.">
            <WalletConnectButton />
          </SafeBoundary>
        </div>
      </div>
    </div>
  );
}
