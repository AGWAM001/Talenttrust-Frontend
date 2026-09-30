import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/toast/toast-provider';

/**
 * Resolve the canonical site URL exactly once per module evaluation.
 *
 * Invariants:
 * - The returned URL is always absolute and parseable, so `metadataBase`
 *   never throws during concurrent server renders or static generation.
 * - Repeated/concurrent evaluation of this module is idempotent: the same
 *   environment input always yields the same normalized origin.
 * - Invalid or non-http(s) values fall back to a safe default instead of
 *   producing a partially-initialized module (which would surface as a
 *   non-deterministic crash across racing requests).
 */
const DEFAULT_SITE_URL = 'http://localhost:3000';

function resolveSiteUrl(raw: string | undefined): string {
  const candidate = (raw ?? '').trim();
  if (candidate.length === 0) {
    return DEFAULT_SITE_URL;
  }
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return DEFAULT_SITE_URL;
    }
    return parsed.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
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
import { registerDefaultCommands } from '@/lib/commands/defaultCommands';

/**
 * Register the default command palette commands exactly once per process.
 *
 * Invariants:
 * - Concurrent or repeated module evaluation (e.g. HMR, multiple render
 *   workers, or racing requests in the same isolate) must not double-register
 *   commands, which would otherwise produce duplicate entries and stale
 *   handlers in the palette.
 * - The guard is stored on `globalThis` so it survives module re-evaluation
 *   without leaking into the public API surface.
 */
const COMMANDS_REGISTERED_FLAG = '__talenttrust_defaultCommandsRegistered__';

type GlobalWithCommandsFlag = typeof globalThis & {
  [COMMANDS_REGISTERED_FLAG]?: boolean;
};

const globalScope = globalThis as GlobalWithCommandsFlag;

if (globalScope[COMMANDS_REGISTERED_FLAG] !== true) {
  registerDefaultCommands();
  globalScope[COMMANDS_REGISTERED_FLAG] = true;
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
                    <Navbar />
                    <HeaderActions />
                  </header>
                  <main className="flex-1 p-6" tabIndex={-1} id="main-content">
                    {children}
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
 
/**
 * Layout invariants (concurrency hardening):
 * - `siteUrl`/`metadataBase` are computed once at module load from a
 *   validated, normalized origin; concurrent renders observe the same value.
 * - Default command registration is idempotent across repeated or racing
 *   module evaluation, preventing duplicate palette entries.
 * - Provider nesting order is stable and deterministic; no per-render side
 *   effects are introduced here, so retries and partial failures cannot
 *   leave the tree in an inconsistent state.
 */
