import {
  assertNoDuplicateActionIds,
  getCommandPaletteActions,
  matchesCommandPaletteQuery,
  type CommandPaletteAction,
} from './commandPaletteActions';

describe('getCommandPaletteActions', () => {
  it('registers a single, uniquely-identified wallet entry', () => {
    const connectWallet = jest.fn();
    const actions = getCommandPaletteActions({ connectWallet });

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      id: 'wallet-open',
      label: 'Open Wallet',
    });
  });

  it('registers searchable keywords covering common wallet terms', () => {
    const actions = getCommandPaletteActions({ connectWallet: jest.fn() });
    const [walletAction] = actions;

    expect(walletAction.keywords).toEqual(
      expect.arrayContaining(['wallet', 'connect', 'freighter', 'stellar']),
    );
  });

  it('does not register duplicate action ids', () => {
    const actions = getCommandPaletteActions({ connectWallet: jest.fn() });
    expect(() => assertNoDuplicateActionIds(actions)).not.toThrow();
  });

  it('invokes connectWallet when the wallet action is performed', () => {
    const connectWallet = jest.fn();
    const [walletAction] = getCommandPaletteActions({ connectWallet });

    walletAction.perform();

    expect(connectWallet).toHaveBeenCalledTimes(1);
  });

  it('does not throw when connectWallet returns a promise', () => {
    const connectWallet = jest.fn().mockResolvedValue(undefined);
    const [walletAction] = getCommandPaletteActions({ connectWallet });

    expect(() => walletAction.perform()).not.toThrow();
    expect(connectWallet).toHaveBeenCalledTimes(1);
  });
});

describe('matchesCommandPaletteQuery', () => {
  const action: CommandPaletteAction = {
    id: 'wallet-open',
    label: 'Open Wallet',
    keywords: ['wallet', 'connect', 'freighter', 'stellar', 'account', 'balance'],
    perform: jest.fn(),
  };

  it('matches an empty query (shows all actions)', () => {
    expect(matchesCommandPaletteQuery(action, '')).toBe(true);
  });

  it('matches a query that is only whitespace', () => {
    expect(matchesCommandPaletteQuery(action, '   ')).toBe(true);
  });

  it('matches by (case-insensitive) label substring', () => {
    expect(matchesCommandPaletteQuery(action, 'wallet')).toBe(true);
    expect(matchesCommandPaletteQuery(action, 'WALLET')).toBe(true);
    expect(matchesCommandPaletteQuery(action, 'Open')).toBe(true);
  });

  it('matches by keyword even when the keyword is not in the label', () => {
    expect(matchesCommandPaletteQuery(action, 'freighter')).toBe(true);
    expect(matchesCommandPaletteQuery(action, 'stellar')).toBe(true);
  });

  it('does not match an unrelated query', () => {
    expect(matchesCommandPaletteQuery(action, 'contracts')).toBe(false);
  });
});

describe('assertNoDuplicateActionIds', () => {
  it('does not throw for a list of unique ids', () => {
    const actions: CommandPaletteAction[] = [
      { id: 'a', label: 'A', keywords: [], perform: jest.fn() },
      { id: 'b', label: 'B', keywords: [], perform: jest.fn() },
    ];
    expect(() => assertNoDuplicateActionIds(actions)).not.toThrow();
  });

  it('throws when two actions share the same id', () => {
    const actions: CommandPaletteAction[] = [
      { id: 'wallet-open', label: 'Open Wallet', keywords: [], perform: jest.fn() },
      { id: 'wallet-open', label: 'Open Wallet Again', keywords: [], perform: jest.fn() },
    ];
    expect(() => assertNoDuplicateActionIds(actions)).toThrow(
      'CommandPalette: duplicate action id "wallet-open" registered',
    );
  });

  it('does not throw for an empty list', () => {
    expect(() => assertNoDuplicateActionIds([])).not.toThrow();
  });
});
