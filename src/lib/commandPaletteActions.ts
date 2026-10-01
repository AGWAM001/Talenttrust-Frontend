/**
 * Registry of actions exposed through the global command palette
 * (see {@link CommandPalette}).
 *
 * Kept as a plain module (rather than inline in the component) so the
 * registration rules — unique ids, searchable keywords — can be unit
 * tested independently of React rendering.
 */
export interface CommandPaletteAction {
  /** Stable, unique identifier. Used to detect duplicate registrations. */
  id: string;
  /** Primary label shown in the palette list and used for search matching. */
  label: string;
  /** Additional search terms a user might type to find this action. */
  keywords: string[];
  /** Invoked when the action is activated (Enter or click). */
  perform: () => void;
}

interface CommandPaletteActionDeps {
  /** Initiates a wallet connection; see {@link useWallet}'s `connect`. */
  connectWallet: () => void | Promise<void>;
}

/**
 * Builds the list of actions registered with the command palette.
 *
 * The wallet entry triggers the existing wallet-connect flow rather than
 * routing to a page, since wallet is a global header widget with no
 * dedicated route.
 */
export function getCommandPaletteActions({
  connectWallet,
}: CommandPaletteActionDeps): CommandPaletteAction[] {
  return [
    {
      id: 'wallet-open',
      label: 'Open Wallet',
      keywords: ['wallet', 'connect', 'freighter', 'stellar', 'account', 'balance'],
      perform: () => {
        void connectWallet();
      },
    },
  ];
}

/** Returns true when `action`'s label or keywords match the given query. */
export function matchesCommandPaletteQuery(action: CommandPaletteAction, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    action.label.toLowerCase().includes(needle) ||
    action.keywords.some((keyword) => keyword.toLowerCase().includes(needle))
  );
}

/**
 * Throws if any two actions share an `id`. Called whenever the registry is
 * built so a duplicate entry fails fast instead of silently shadowing an
 * existing command.
 */
export function assertNoDuplicateActionIds(actions: CommandPaletteAction[]): void {
  const seen = new Set<string>();
  for (const action of actions) {
    if (seen.has(action.id)) {
      throw new Error(`CommandPalette: duplicate action id "${action.id}" registered`);
    }
    seen.add(action.id);
  }
}
