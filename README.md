# TalentTrust Frontend

Next.js web app for secure freelance payments using blockchain technology. Includes a dashboard and Stellar wallet integration.

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup

```bash
# Clone and enter the repo
git clone <your-repo-url>
cd talenttrust-frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script        | Description              |
|---------------|--------------------------|
| `npm run dev` | Start dev server (3000)  |
| `npm run build` | Production build       |
| `npm start`   | Start production server  |
| `npm run lint` | Run ESLint             |
| `npm test`    | Run Jest tests           |

## Documentation Index

This repository keeps user-facing and implementation notes inside the `docs/` folder. Key documentation includes:

- `docs/components/Accessibility.md` — Accessibility testing, a11y helpers, and issue #383 notes
- `docs/components/Forms.md` — Consolidated Forms API reference (props, types, minimal usage for `FormField`, `ErrorSummary`, `ContractCreationForm`, `CreateContractForm`, `MilestoneCreationForm`, `WalletAddressInput`, `ConfirmDialog`) — closes #859
- `docs/components/ReputationPage.md` — Reputation page implementation and rendering states
- `docs/components/ReputationProfile.md` — Reputation component API reference (props, helpers, examples)
- `docs/data-model.md` — Data model and persistence guide
- `docs/milestones-data-flow.md` — Milestones data flow diagram (fetch → filter → render → create)
- `docs/persistence.md` — Persistence API and local storage patterns
- `docs/preferences.md` — Preferences provider and currency/locale helpers
- `docs/contexts/wallet-session.md` — Wallet session lifecycle and idle disconnect guidance
- `docs/reputation/hooks.md` — Reputation module helper functions, utilities, and types with usage examples
- `docs/implementation/ISSUE_383_IMPLEMENTATION.md` — Folded implementation notes for issue #383

If you find other implementation notes in the repository root, they have been consolidated into `docs/` where appropriate. Remove or ignore remaining one-off files.

## Architecture

The project is built on Next.js App Router. The UI layer shares components, whilst global state is handled via an ordered provider stack.

### Route Map

| Route | Description | Status |
|-------|-------------|--------|
| `/` | Landing page / Home | Placeholder (contains a login form demo and toast demo) |
| `/contracts` | Contracts list | Placeholder handler (uses local storage stub) |
| `/contracts/[id]` | Contract details | Implemented — `ContractSummary`, `ContractProgress`, `MilestonesList`, and `ActionPanel` mounted from resolved `ContractData`; loading skeletons and error states fully wired |
| `/milestones` | Milestones list | Implemented (filterable status list) |
| `/reputation` | User reputation | Placeholder (empty state) |

### Provider Stack

Providers are wired in `src/app/layout.tsx` with a specific nesting order:

1. **[`PreferencesProvider`](src/lib/preferences.tsx)** (Outermost)
   Provides user-level preferences (locale, currency) which can be consumed by any subsequent provider or component.
2. **[`ToastProvider`](src/components/toast/toast-provider.tsx)**
   Provides the global notification system. Placed here so that the wallet context or other deeper components can trigger alerts.
3. **[`WalletProvider`](src/contexts/WalletContext.tsx)** (Innermost)
   Manages Stellar wallet connections. It can consume preferences and dispatch toast notifications if connections fail or succeed.

### Shared Components

Shared components live in `src/components/` (e.g., `src/components/toast/`). Shared utilities and domain types live in `src/lib/` and `src/types/`.

### Data Model & Persistence

The application relies on a client-side persistence layer for storing contracts and milestones. For a complete overview of the API, `AppData` shape, and update operations, see the [Persistence API and Data Model Guide](docs/data-model.md).

User-level settings are handled by `PreferencesProvider`. For the preference model, theme hydration flow, safe storage behavior, and `formatAmount` branches, see the [Preferences Provider Guide](docs/preferences.md).

## Toast notifications

The app includes a global accessible toast system for transient feedback:

- `ToastProvider` is mounted in the root layout so notifications work across the app.
- Use `useToast()` in client components to trigger `showSuccess(...)` and `showError(...)`.
- Success messages announce through a polite `aria-live` region.
- Error messages announce through an assertive `aria-live` region.
- **Viewport overflow protection**: at most **4 toasts** are visible at once (`MAX_VISIBLE_TOASTS = 4`). When a new toast would exceed this cap, the oldest visible toast is evicted and its auto-dismiss timer is cancelled before the new toast is appended. The live-region announcer always reflects the newest toast.
- **Optional action buttons**: pass `action: { label, onClick }` to render an inline button (e.g. "Retry" or "Undo"). Clicking it fires the callback and immediately dismisses the toast. The label is rendered as plain text (XSS-safe). Omitting `action` keeps existing behavior unchanged.

## Session safety

To improve security on shared or public machines, the [`WalletProvider`](src/contexts/WalletContext.tsx) includes an optional idle auto-disconnect safeguard.

- **Configurable Timeout**: Pass an `idleTimeout` prop (in milliseconds) to [`WalletProvider`](src/contexts/WalletContext.tsx) in [`src/app/layout.tsx`](src/app/layout.tsx).
- **Activity Monitoring**: The timer resets on user activity (pointer moves, key presses, clicks, tab visibility changes).
- **Auto-Disconnect**: Once the idle period expires, the wallet is automatically disconnected and a "Session expired" toast is shown.
- **Default Behaviour**: The safeguard is disabled by default (`idleTimeout={0}`). Recommended value for production is 15 minutes (`900000` ms).

For more details on the session lifecycle, storage keys, and inactivity events, see the [Wallet Session Management Guide](docs/contexts/wallet-session.md).

Example:

```tsx
<WalletProvider idleTimeout={900000}>
  {children}
</WalletProvider>
```

## Crawling and sitemap

To ensure the app provides first-class support for search engine crawlers using Next.js metadata routes.

- **`/robots.txt`**: Generated by `src/app/robots.ts`, allows all crawlers and points to the sitemap.
- **`/sitemap.xml`**: Generated by `src/app/sitemap.ts`, lists all public static routes with a sensible `lastModified` timestamp.

### Environment variable

Set `NEXT_PUBLIC_SITE_URL` in `.env` or your deployment environment to point to your production domain. Falls back to `http://localhost:3000` when not set.

Example:

```bash
# .env.local
NEXT_PUBLIC_SITE_URL=https://talenttrust.app
```

Example:

## Wallet integration

The app connects to the **Freighter** Stellar wallet extension via [`@stellar/freighter-api`](https://github.com/stellar/freighter).

### Setup

1. Install the [Freighter browser extension](https://freighter.app) for Chrome or Firefox.
2. Create or import a Stellar wallet in Freighter.
3. The app detects Freighter automatically — no API keys or configuration required.

### How it works

- `WalletProvider` (in `src/contexts/WalletContext.tsx`) manages the connection lifecycle.
- `connect()` checks for Freighter availability (`window.freighter`), calls `requestAccess()` to prompt the user, and persists the `G...` public key in `localStorage`.
- On page refresh, the address is rehydrated from `localStorage` using the same pattern as `PreferencesProvider` (`src/lib/safeStorage.ts`).
- `disconnect()` clears the address from state and removes it from storage.
- The `useWallet()` hook exposes `{ address, isConnecting, error, connect, disconnect }`.

### Error messages

| Condition | Message |
|-----------|---------|
| Freighter not installed | `Freighter wallet is not installed. Please install the Freighter browser extension.` |
| User rejected the prompt | `User rejected the connection request.` |
| Unexpected failure | Propagated from the underlying error |

### Security

- Only the Stellar public key (`G...`) is persisted in `localStorage` — no private keys, seeds, or personal information.
- The public key is never logged to the console or sent to external services.
- All `window` / wallet access is guarded for SSR (Next.js App Router).

## Crawling and sitemap

To ensure the app provides first-class support for search engine crawlers using Next.js metadata routes.

- **`/robots.txt`**: Generated by `src/app/robots.ts`, allows all crawlers and points to the sitemap.
- **`/sitemap.xml`**: Generated by `src/app/sitemap.ts`, lists all public static routes with a sensible `lastModified` timestamp.

## SEO and social previews

The root layout exports typed Next.js metadata in [`src/app/layout.tsx`](src/app/layout.tsx) so shared links include Open Graph and Twitter card previews.

- **`metadataBase`** is derived from `NEXT_PUBLIC_SITE_URL`, falling back to `http://localhost:3000` during local development.
- **Open Graph and Twitter fields** reuse the same safe, user-facing copy used elsewhere in the app: "Safe, secure payments that protect both freelancers and clients throughout your project."
- **Preview image**: the static social card lives at [`public/og-preview.svg`](public/og-preview.svg) and is referenced with a relative path so Next.js can resolve it correctly from `metadataBase`.
- **Copy guidance**: keep future preview copy aligned with [`docs/COPYWRITING_GUIDE.md`](docs/COPYWRITING_GUIDE.md) and avoid absolute guarantees or technical jargon.

## Environment variables

This app uses Next.js environment variables. Public variables must be prefixed with `NEXT_PUBLIC_` and are exposed to browser JavaScript. Secrets must never be stored in `NEXT_PUBLIC_` variables.

- `NEXT_PUBLIC_SITE_URL` (required in production)
  - Used by `src/app/layout.tsx`, `src/app/robots.ts`, and `src/app/sitemap.ts`.
  - Provides the canonical site URL for `metadataBase`, Open Graph/Twitter previews, generated `robots.txt`, and `sitemap.xml` entries.
  - If unset, the app falls back to `http://localhost:3000` for local development.

- `NEXT_PUBLIC_WALLET_RPC_URL` (reserved)
  - Reserved for future wallet integration and RPC provider configuration.
  - Do not store private keys or secrets here; this is only for public JSON-RPC endpoints.

- `NEXT_PUBLIC_WALLET_CONNECT_RELAY` (reserved)
  - Reserved for future WalletConnect relay support.
  - Example relay URL: `wss://relay.walletconnect.com`.

The repo includes a sample file at [`.env.example`](.env.example) with the current public config and reserved future variables.

## PWA / Web Manifest

The app exposes a [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) at `/manifest.webmanifest` via `src/app/manifest.ts`, enabling users to install TalentTrust on their device home screen with proper branding.

- **`src/app/manifest.ts`** — Generates the manifest with name, short name, description, theme/background colors (aligned to `src/app/globals.css`), standalone display mode, and icon references.
- **Icon assets** — Three icon formats are provided under `public/`:
  - `public/icon.svg` — Scalable vector icon (preferred format).
  - `public/icon-192x192.png` — 192×192 PNG placeholder.
  - `public/icon-512x512.png` — 512×512 PNG placeholder.

  > **Note**: The PNG files are blue-square placeholders generated for development. A designer should replace them with branded raster icons before production deployment.

The manifest is automatically linked via the root layout metadata (`src/app/layout.tsx`), which also declares the favicon and Apple touch icon.

## Stellar address helpers

The shared utility layer now includes lightweight Stellar address helpers in [src/lib/stellarAddress.ts](src/lib/stellarAddress.ts) for display and form use:

- `isValidStellarAddress(value)` returns `true` only for a trimmed, uppercased value that looks like a Stellar public key: it starts with `G`, is exactly 56 characters long, and uses the base32 alphabet `A-Z` and `2-7`.
- `normalizeStellarAddress(value)` trims whitespace and uppercases the value without throwing on invalid input.
- `truncateAddress(value, prefixLength?, suffixLength?)` in [src/lib/truncateAddress.ts](src/lib/truncateAddress.ts) securely shortens addresses (or any string) by preserving the start and end, and inserting an ellipsis. Strings shorter than or equal to `prefixLength + suffixLength + 3` are returned untouched.
- The display truncation path uses these helpers so clearly malformed addresses are treated as ordinary strings rather than being shortened as if they were valid keys.

## Authentication form validation and accessibility

The homepage contains an accessible, fully validated sign-in form:

- **Validation logic**: Form validation is extracted to a pure, isolated helper (`src/lib/validateLogin.ts`) that enforces required checks and format policies (email structure, minimum length of 8 for password).
- **Error Summary**: If validation fails, an `ErrorSummary` component is rendered at the top of the form. It uses `role="alert"` and automatically gains focus via standard DOM ref to announce form errors immediately to screen reader users. The items in the list act as anchor links to directly jump focus to the respective input field.
- **Form Fields & Inputs**: Individual fields are wrapped in `FormField` to handle accessibility connections. It automatically assigns:
  - An associative `<label>` linked by `id`.
  - `aria-invalid="true"` to denote inputs that contain errors.
  - `aria-describedby` pointing to the helper text and error message paragraph elements so screen readers read the context when targeting the inputs.
- **Success notification**: Upon valid submission, the `useToast` hook triggers a success notification instead of standard browser alerts.

## Contributing

1. Fork the repo and create a branch from `main`.
2. Install deps, run tests and build: `npm install && npm test && npm run build`.
3. Open a pull request. CI runs lint, build, and tests on push/PR to `main`.

When filing issues or opening PRs, please use the provided GitHub templates — they make reviews faster and keep the project history clean:

- **Bug reports** — `.github/ISSUE_TEMPLATE/bug_report.md`: includes reproduction steps, environment details, and an impacted-route field.
- **Feature requests** — `.github/ISSUE_TEMPLATE/feature_request.md`: covers problem statement, proposed solution, and alternatives.
- **Pull requests** — `.github/pull_request_template.md`: includes a pre-flight checklist (`lint` / `test` / `build`), a 95% coverage confirmation, and accessibility & security notes.

If you need quick help before filing an issue, the community [Discord](https://discord.gg/WqnGpcPx) is the fastest way to reach the team.

## Features

### Milestones

The `/milestones` route renders a typed `Milestone[]` list with a status filter:

- **Status filter** — an accessible `radiogroup` (`fieldset` + `legend`) lets users narrow results by *All*, *Pending*, *Completed*, *Paid*, or *Disputed*.
- **Empty state** — when no items match the active filter, a contextual `EmptyState` is shown with a prompt to add a milestone.
- **Accessible result announcement** — an `aria-live="polite"` region announces the filtered count (e.g. "Showing 2 pending milestones") to assistive-technology users.
- **Currency formatting** — payouts are formatted via `formatAmount` from `src/lib/preferences.tsx`, respecting the user's chosen locale and currency preference.

---

## CI/CD

GitHub Actions runs on push and pull requests to `main`:

- Install dependencies
- Lint (`npm run lint`)
- Build (`npm run build`)
- Tests (`npm test`)
- Dependency audit (`npm audit --audit-level=high --production`)

Ensure these pass locally before pushing.

### Dependency updates

Dependency management uses two complementary layers that work in tandem:

| Layer | Mechanism | Nature |
|-------|-----------|--------|
| **Proactive** | Dependabot (`.github/dependabot.yml`) | Opens weekly PRs to keep packages and action pins current |
| **Reactive** | `npm audit` step in `ci.yml` | Blocks any PR — including Dependabot's — that introduces a new high/critical advisory |

Because every Dependabot PR must pass the full CI pipeline (lint → build → test → audit) before it can be merged, the two layers reinforce each other: Dependabot brings updates in, and the audit gate ensures none of them silently introduce a vulnerability.

**Reviewing grouped minor/patch PRs**

Dependabot batches all minor and patch npm updates into a single weekly PR labelled `dependencies`. When reviewing:

1. Check the CI status — all green means lint, build, tests, and the audit gate passed.
2. Scan the diff in `package-lock.json` for any unexpected indirect dependency changes.
3. If everything looks clean, approve and merge. No manual testing is normally required for grouped minor/patch updates.

**Reviewing major version PRs**

Each major npm bump arrives as its own PR so breaking changes can be assessed individually:

1. Read the package's changelog or migration guide for the version jump.
2. Run `npm install` locally and execute `npm test && npm run build` to catch any compile-time or runtime breakage.
3. Update any affected code, then approve the PR once CI is green.

**GitHub Actions pin updates**

Dependabot also opens separate weekly PRs to keep `actions/checkout`, `actions/setup-node`, and similar pins current. These are low-risk and can generally be merged as long as CI passes. Confirm the pinned SHA in the updated workflow still points to a tagged release, not an arbitrary commit.

> Auto-merge is **not** enabled. Every Dependabot PR requires a passing CI run and human approval before it lands on `main`.

### Security audits

The pipeline runs `npm audit --audit-level=high --production` after tests. Any **high** or **critical** advisory blocks the merge.

**Triage a finding**

1. Run `npm audit` locally to read the advisory details and affected package.
2. Check whether a patched version exists: `npm audit fix` (add `--force` only if you accept semver-major bumps and have reviewed the changelog).
3. If no fix is available and the advisory is a false positive or cannot be exploited in this context, document the reason and add the advisory ID to a `.nsprc` / `audit-resolve.json` file (npm ≥ 10: `npm audit --ignore <id>`).

**Waiving an advisory in CI**

Add the `--ignore <advisory-id>` flag to the audit step in `.github/workflows/ci.yml` and leave a comment explaining the waiver, the expected fix date, and a link to the advisory. Example:

```yaml
# Advisory 1234567 – lodash prototype pollution, not reachable in production
# Revisit when lodash@5 is released (tracked in #123).
run: npm audit --audit-level=high --production --ignore 1234567
```

## License

MIT

## Domain Types
Centralized domain types (Contract, Milestone, Reputation) are defined and re-exported from src/types/domain.ts to ensure strict type safety across pages and components.
