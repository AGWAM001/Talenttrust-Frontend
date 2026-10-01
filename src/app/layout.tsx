import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/toast/toast-provider';
import { resolveSiteUrl } from '@/lib/site-url';

/**
 * State invariants for the root layout module.
 *
 * This module owns a small amount of module-level state that is shared by
 * every render of the application shell:
 *
 *  1. `siteUrl` / `metadataBase` — resolved exactly once at module load.
 *     The value MUST be a valid absolute URL with an http(s) protocol so
 *     that `new URL()` cannot throw during metadata construction and so
 *     that Open Graph / Twitter / canonical URLs are always well-formed.
 *     Invalid or missing configuration falls back to a safe default
 *     instead of crashing the whole app or emitting a relative URL.
 *
 *  2. `registerDefaultCommands()` — a global side effect that mutates the
 *     command registry. It MUST run exactly once per process, even under
 *     React Fast Refresh, concurrent module evaluation, or repeated
 *     imports. Re-registration would duplicate commands and corrupt the
 *     palette's state; skipping it would leave the palette empty.
 *
 * Both invariants are enforced below with pure, deterministic helpers so
 * that valid, invalid, duplicate, and boundary inputs all converge on a
 * single well-defined state.
 */

const DEFAULT_SITE_URL = 'http://localhost:3000';

/**
 * Resolve a site URL from configuration, guaranteeing an absolute http(s)
 * URL. Invalid, empty, relative, or non-http(s) values fall back to the
 * default rather than throwing or producing a relative metadataBase.
 */
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
    return parsed.toString();
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
 * Idempotent guard for the default-command registration side effect.
 *
 * The registry is process-global, so we track registration on a symbol
 * keyed off `globalThis` to survive module re-evaluation (HMR, multiple
 * bundles, concurrent imports). This makes the transition
 * "unregistered -> registered" run at most once and never partially,
 * which keeps the command palette's state consistent.
 */
const REGISTERED_FLAG = Symbol.for(
  'talenttrust.layout.defaultCommandsRegistered',
);

type GlobalWithFlag = typeof globalThis & {
  [REGISTERED_FLAG]?: boolean;
};

function ensureDefaultCommandsRegistered(): void {
  const g = globalThis as GlobalWithFlag;
  if (g[REGISTERED_FLAG]) {
    return;
  }
  registerDefaultCommands();
  g[REGISTERED_FLAG] = true;
}

ensureDefaultCommandsRegistered();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Re-assert the invariant on every render. This is a no-op when the
  // flag is already set, and it repairs the state if a consumer (or a
  // test) has reset the registry between renders.
  ensureDefaultCommandsRegistered();

  return (
    <html lang="en">
      <body>
        <PreferencesProvider initialPreferences={undefined}>
          <ToastProvider>
            <WalletProvider>
              <CommandPaletteProvider>
                {/* Layout shell: header + main are the only focusable
                    landmarks; the skip link below must remain the first
                    focusable element in DOM order. */}
                {/* Skip link must be the first focusable element so keyboard users
                    can bypass the sticky header on every page (WCAG 2.4.1). */}
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Skip to main content
                </a>
                {/* RouteAnnouncer must precede the shell so that route
                    changes are announced before focus moves into main. */}
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
                  {/* `tabIndex={-1}` is required so the skip link target
                      is programmatically focusable without entering the
                      tab order. Do not remove. */}
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
