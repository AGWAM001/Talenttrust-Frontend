/**
 * exportDialogs.test.ts
 *
 * Tests for src/lib/exportDialogs.ts (issue #53).
 * Covers: CSV escaping, formula injection neutralisation, serialisation,
 * filter-respect, empty-view handling, and download trigger.
 */

import {
  csvEscape,
  dialogsToCsv,
  dialogsToJson,
  triggerDownload,
  downloadDialogsCsv,
  downloadDialogsJson,
  type DialogRecord,
} from '../exportDialogs';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeDialog = (overrides: Partial<DialogRecord> = {}): DialogRecord => ({
  id: 'dlg-001',
  title: 'Release funds',
  description: 'Confirm fund release to contractor.',
  status: 'Open',
  createdAt: '2024-01-15',
  resolvedAt: null,
  ...overrides,
});

const sampleDialogs: DialogRecord[] = [
  makeDialog({ id: 'dlg-001', title: 'Release funds', status: 'Open' }),
  makeDialog({ id: 'dlg-002', title: 'Dispute contract', status: 'Pending', resolvedAt: null }),
  makeDialog({ id: 'dlg-003', title: 'Close project', status: 'Closed', resolvedAt: '2024-02-01' }),
];

// ---------------------------------------------------------------------------
// csvEscape
// ---------------------------------------------------------------------------

describe('csvEscape', () => {
  it('returns an empty string for null', () => {
    expect(csvEscape(null)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(csvEscape(undefined)).toBe('');
  });

  it('returns plain string unchanged when no special chars', () => {
    expect(csvEscape('hello')).toBe('hello');
  });

  it('wraps in double-quotes when value contains a comma', () => {
    expect(csvEscape('hello, world')).toBe('"hello, world"');
  });

  it('wraps in double-quotes when value contains a double-quote', () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it('doubles embedded double-quotes', () => {
    expect(csvEscape('a"b"c')).toBe('"a""b""c"');
  });

  it('wraps in double-quotes when value contains a newline', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });

  it('wraps in double-quotes when value contains a carriage return', () => {
    expect(csvEscape('line1\rline2')).toBe('"line1\rline2"');
  });

  it('prefixes = with tab to neutralise formula injection', () => {
    const result = csvEscape('=SUM(A1)');
    expect(result.startsWith('\t')).toBe(true);
    expect(result).toContain('=SUM(A1)');
  });

  it('prefixes + with tab to neutralise formula injection', () => {
    const result = csvEscape('+cmd|...');
    expect(result.startsWith('\t')).toBe(true);
  });

  it('prefixes - with tab to neutralise formula injection', () => {
    const result = csvEscape('-2+3');
    expect(result.startsWith('\t')).toBe(true);
  });

  it('prefixes @ with tab to neutralise formula injection', () => {
    const result = csvEscape('@SUM');
    expect(result.startsWith('\t')).toBe(true);
  });

  it('converts numbers to strings', () => {
    expect(csvEscape(42)).toBe('42');
  });

  it('converts booleans to strings', () => {
    expect(csvEscape(true)).toBe('true');
  });
});

// ---------------------------------------------------------------------------
// dialogsToCsv — header row
// ---------------------------------------------------------------------------

describe('dialogsToCsv — header row', () => {
  it('first line is the header row', () => {
    const csv = dialogsToCsv([]);
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toBe('id,title,description,status,createdAt,resolvedAt');
  });

  it('produces only a header row for an empty array', () => {
    const csv = dialogsToCsv([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// dialogsToCsv — data rows
// ---------------------------------------------------------------------------

describe('dialogsToCsv — data rows', () => {
  it('produces one data row per dialog', () => {
    const csv = dialogsToCsv(sampleDialogs);
    const lines = csv.split('\n');
    // header + 3 data rows
    expect(lines).toHaveLength(4);
  });

  it('each row contains the correct id', () => {
    const csv = dialogsToCsv(sampleDialogs);
    const lines = csv.split('\n');
    expect(lines[1]).toMatch(/dlg-001/);
    expect(lines[2]).toMatch(/dlg-002/);
    expect(lines[3]).toMatch(/dlg-003/);
  });

  it('each row contains the title', () => {
    const csv = dialogsToCsv([makeDialog({ id: 'x', title: 'My Dialog' })]);
    expect(csv).toContain('My Dialog');
  });

  it('each row contains the status', () => {
    const csv = dialogsToCsv([makeDialog({ id: 'x', status: 'Pending' })]);
    expect(csv).toContain('Pending');
  });

  it('resolvedAt is empty string when null', () => {
    const csv = dialogsToCsv([makeDialog({ id: 'x', resolvedAt: null })]);
    const dataRow = csv.split('\n')[1];
    // last field should be empty
    expect(dataRow.endsWith(',')).toBe(true);
  });

  it('resolvedAt is included when provided', () => {
    const csv = dialogsToCsv([makeDialog({ id: 'x', resolvedAt: '2024-03-01' })]);
    expect(csv).toContain('2024-03-01');
  });

  it('escapes commas in title correctly', () => {
    const csv = dialogsToCsv([makeDialog({ id: 'x', title: 'Hello, World' })]);
    expect(csv).toContain('"Hello, World"');
  });

  it('escapes quotes in description correctly', () => {
    const csv = dialogsToCsv([makeDialog({ id: 'x', description: 'Say "hi"' })]);
    expect(csv).toContain('"Say ""hi"""');
  });
});

// ---------------------------------------------------------------------------
// dialogsToJson
// ---------------------------------------------------------------------------

describe('dialogsToJson', () => {
  it('returns valid JSON', () => {
    const json = dialogsToJson(sampleDialogs);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('returns an empty array JSON for an empty input', () => {
    expect(dialogsToJson([])).toBe('[]');
  });

  it('round-trips all fields', () => {
    const json = dialogsToJson(sampleDialogs);
    const parsed = JSON.parse(json) as DialogRecord[];
    expect(parsed).toHaveLength(sampleDialogs.length);
    parsed.forEach((d, i) => {
      expect(d.id).toBe(sampleDialogs[i].id);
      expect(d.title).toBe(sampleDialogs[i].title);
      expect(d.status).toBe(sampleDialogs[i].status);
    });
  });

  it('preserves null resolvedAt', () => {
    const json = dialogsToJson([makeDialog({ id: 'x', resolvedAt: null })]);
    const parsed = JSON.parse(json) as DialogRecord[];
    expect(parsed[0].resolvedAt).toBeNull();
  });

  it('is pretty-printed (contains newlines and spaces)', () => {
    const json = dialogsToJson(sampleDialogs);
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });
});

// ---------------------------------------------------------------------------
// triggerDownload
// ---------------------------------------------------------------------------

describe('triggerDownload', () => {
  let createObjectURLMock: jest.Mock;
  let revokeObjectURLMock: jest.Mock;
  let appendChildSpy: jest.SpyInstance;
  let removeChildSpy: jest.SpyInstance;
  let clickSpy: jest.Mock;

  beforeEach(() => {
    createObjectURLMock = jest.fn().mockReturnValue('blob:fake-url');
    revokeObjectURLMock = jest.fn();
    clickSpy = jest.fn();

    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    // Intercept createElement('a') to capture the anchor
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: clickSpy, writable: true });
      }
      return el;
    });

    appendChildSpy = jest.spyOn(document.body, 'appendChild');
    removeChildSpy = jest.spyOn(document.body, 'removeChild');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls URL.createObjectURL with a Blob', () => {
    triggerDownload('content', 'file.txt', 'text/plain');
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(createObjectURLMock.mock.calls[0][0]).toBeInstanceOf(Blob);
  });

  it('sets the anchor href to the object URL', () => {
    triggerDownload('content', 'file.csv', 'text/csv');
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.href).toContain('blob:fake-url');
  });

  it('sets the anchor download attribute to the provided filename', () => {
    triggerDownload('content', 'my-file.csv', 'text/csv');
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('my-file.csv');
  });

  it('appends then removes the anchor from the body', () => {
    triggerDownload('data', 'test.json', 'application/json');
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledTimes(1);
  });

  it('clicks the anchor to trigger the download', () => {
    triggerDownload('data', 'test.csv', 'text/csv');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('revokes the object URL after download', () => {
    triggerDownload('data', 'test.csv', 'text/csv');
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:fake-url');
  });
});

// ---------------------------------------------------------------------------
// downloadDialogsCsv / downloadDialogsJson — integration
// ---------------------------------------------------------------------------

describe('downloadDialogsCsv', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(document.body, 'appendChild');
    jest.spyOn(document.body, 'removeChild');
    const orig = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = orig(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: jest.fn(), writable: true });
      }
      return el;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('creates a Blob with text/csv mime type', () => {
    downloadDialogsCsv(sampleDialogs);
    const blob = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/csv');
  });

  it('uses default filename dialogs.csv', () => {
    downloadDialogsCsv(sampleDialogs);
    const appendedAnchor = (document.body.appendChild as jest.Mock).mock.calls[0][0] as HTMLAnchorElement;
    expect(appendedAnchor.download).toBe('dialogs.csv');
  });

  it('accepts a custom filename', () => {
    downloadDialogsCsv(sampleDialogs, 'custom.csv');
    const anchor = (document.body.appendChild as jest.Mock).mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('custom.csv');
  });

  it('works with an empty array (exports only headers)', () => {
    expect(() => downloadDialogsCsv([])).not.toThrow();
  });
});

describe('downloadDialogsJson', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(document.body, 'appendChild');
    jest.spyOn(document.body, 'removeChild');
    const orig = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = orig(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: jest.fn(), writable: true });
      }
      return el;
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('creates a Blob with application/json mime type', () => {
    downloadDialogsJson(sampleDialogs);
    const blob = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    expect(blob.type).toContain('application/json');
  });

  it('uses default filename dialogs.json', () => {
    downloadDialogsJson(sampleDialogs);
    const anchor = (document.body.appendChild as jest.Mock).mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('dialogs.json');
  });

  it('accepts a custom filename', () => {
    downloadDialogsJson(sampleDialogs, 'export.json');
    const anchor = (document.body.appendChild as jest.Mock).mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('export.json');
  });

  it('works with an empty array', () => {
    expect(() => downloadDialogsJson([])).not.toThrow();
  });
});
