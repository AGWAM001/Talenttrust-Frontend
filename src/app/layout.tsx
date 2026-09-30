import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/toast/toast-provider';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const metadataBase = new URL(siteUrl);
// Social preview image used by Open Graph and Twitter cards lives in public/.
const socialPreviewImage = '/og-preview.svg';

export const metadata: Metadata = {
  title: 'TalentTrust - Safe Freelance Payments',
  description: 'Safe, secure payments that protect both freelancers and clients throughout your project.',
  metadataBase,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'TalentTrust - Safe Freelance Payments',
    description: 'Safe, secure payments that protect both freelancers and clients throughout your project.',
    type: 'website',
    siteName: 'TalentTrust',
    url: siteUrl,
    images: [
      {
        url: socialPreviewImage,
        width: 1200,
        height: 630,
        alt: 'TalentTrust social preview showing safe freelance payments',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TalentTrust - Safe Freelance Payments',
    description: 'Safe, secure payments that protect both freelancers and clients throughout your project.',
    images: [socialPreviewImage],
  },
};

import { PreferencesProvider } from '@/lib/preferences';
import { SettingsTrigger } from '@/components/settings/SettingsTrigger';
import { WalletProvider } from '@/contexts/WalletContext';
import CommandPalette, { CommandPaletteProvider } from '@/components/CommandPalette';
import RouteAnnouncer from '@/components/RouteAnnouncer';
import Navbar from '@/components/Navbar';
import HeaderActions from '@/components/HeaderActions';
import SafeBoundary from '@/components/SafeBoundary';
import { registerDefaultCommands } from '@/lib/commands/defaultCommands';
import { reportError } from '@/lib/errorReporter';

/**
 * Guard the module-level command-registration call so that a failure in
 * the registry (e.g. a duplicate-id violation or an unexpected throw) is
 * captured and reported without aborting the server-render of the root
 * layout. The palette will simply start empty, which is recoverable — the
 * page still loads and every other feature continues to function.
 *
 * Invariant: this is the only call site; the commands are registered once
 * at module initialisation time. Concurrent or duplicate calls cannot
 * produce inconsistent state because registerCommand uses a Map (last
 * write wins) and the function is idempotent by id.
 */
try {
  registerDefaultCommands();
} catch (err) {
  reportError(err, 'registerDefaultCommands', 'error', {
    location: 'layout module initialisation',
  });
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PreferencesProvider>
          <ToastProvider>
            <WalletProvider>
              <CommandPaletteProvider>
                {/* Skip link must be the first focusable element so keyboard users
                    can bypass the sticky header on every page (WCAG 2.4.1). */}
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Skip to main content
                </a>
                <RouteAnnouncer />
                <div className="min-h-screen bg-slate-50 flex flex-col">
                  <header className="sticky top-0 z-40 flex w-full flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold tracking-tight text-slate-900">
                        TalentTrust
                      </span>
                    </div>
                    {/*
                     * Navbar and HeaderActions are wrapped in independent SafeBoundary
                     * instances so that a render failure in one does not cascade to
                     * the other, and neither can kill the surrounding header chrome.
                     *
                     * Invariant: each boundary is independent — a throw inside Navbar
                     * cannot enter the HeaderActions subtree, and vice versa.
                     */}
                    <SafeBoundary fallbackTitle="Navigation failed to load.">
                      <Navbar />
                    </SafeBoundary>
                    <SafeBoundary fallbackTitle="Header actions failed to load.">
                      <HeaderActions />
                    </SafeBoundary>
                  </header>
                  {/*
                   * Page content is isolated in its own SafeBoundary so that a
                   * route-level render crash does not take down the sticky header,
                   * navigation, or wallet controls. The user can still navigate
                   * away after a main-content failure.
                   *
                   * Invariant: SafeBoundary calls reportError via componentDidCatch,
                   * so every caught exception is observable in logs/metrics without
                   * exposing the raw error message in the UI.
                   */}
                  <main className="flex-1 p-6" tabIndex={-1} id="main-content">
                    <SafeBoundary fallbackTitle="This page failed to load.">
                      {children}
                    </SafeBoundary>
                  </main>
                </div>
                <CommandPalette />
                <SettingsTrigger />
              </CommandPaletteProvider>
            </WalletProvider>
          </ToastProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
