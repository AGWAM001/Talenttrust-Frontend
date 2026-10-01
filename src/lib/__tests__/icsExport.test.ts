/**
 * icsExport.test.ts
 *
 * Tests for src/lib/icsExport.ts.
 * Covers: ICS text escaping, date formatting, status mapping, VCALENDAR
 * generation, milestone filtering (skip no-due-date), and download trigger.
 */

import {
  escapeICSText,
  milestoneStatusToICS,
  formatICSDDate,
  milestonesToICS,
  downloadMilestonesICS,
} from '../icsExport';
import type { Milestone } from '@/components/MilestonesList';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeMilestone = (overrides: Partial<Milestone> = {}): Milestone => ({
  id: 'ms-001',
  title: 'Project Kickoff',
  status: 'Pending',
  payout: 2500,
  currency: 'USD',
  dueDate: '2026-05-15',
  ...overrides,
});

const sampleMilestones: Milestone[] = [
  makeMilestone({ id: 'ms-001', title: 'Project Kickoff', status: 'Pending', dueDate: '2026-05-15' }),
  makeMilestone({ id: 'ms-002', title: 'UI/UX Design Handoff', status: 'Completed', dueDate: '2026-06-01' }),
  makeMilestone({ id: 'ms-003', title: 'Payment Gateway Integration', status: 'Disputed', dueDate: '2026-04-20' }),
];

// ---------------------------------------------------------------------------
// escapeICSText
// ---------------------------------------------------------------------------

describe('escapeICSText', () => {
  it('returns plain string unchanged when no special chars', () => {
    expect(escapeICSText('hello world')).toBe('hello world');
  });

  it('escapes backslash with double backslash', () => {
    expect(escapeICSText('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  it('escapes semicolon with backslash-semicolon', () => {
    expect(escapeICSText('hello; world')).toBe('hello\\; world');
  });

  it('escapes comma with backslash-comma', () => {
    expect(escapeICSText('hello, world')).toBe('hello\\, world');
  });

  it('escapes newline with literal backslash-n', () => {
    expect(escapeICSText('line1\nline2')).toBe('line1\\nline2');
  });

  it('escapes all special characters combined', () => {
    const input = 'a\\b;c,d\ne';
    const expected = 'a\\\\b\\;c\\,d\\ne';
    expect(escapeICSText(input)).toBe(expected);
  });

  it('handles empty string', () => {
    expect(escapeICSText('')).toBe('');
  });

  it('handles strings with only special characters', () => {
    expect(escapeICSText('\\;,\n')).toBe('\\\\\\;\\,\\n');
  });
});

// ---------------------------------------------------------------------------
// milestoneStatusToICS
// ---------------------------------------------------------------------------

describe('milestoneStatusToICS', () => {
  it('maps Completed to CONFIRMED', () => {
    expect(milestoneStatusToICS('Completed')).toBe('CONFIRMED');
  });

  it('maps Paid to CONFIRMED', () => {
    expect(milestoneStatusToICS('Paid')).toBe('CONFIRMED');
  });

  it('maps Pending to TENTATIVE', () => {
    expect(milestoneStatusToICS('Pending')).toBe('TENTATIVE');
  });

  it('maps Active to TENTATIVE', () => {
    expect(milestoneStatusToICS('Active')).toBe('TENTATIVE');
  });

  it('maps Disputed to TENTATIVE', () => {
    expect(milestoneStatusToICS('Disputed')).toBe('TENTATIVE');
  });

  it('maps unknown status to TENTATIVE', () => {
    expect(milestoneStatusToICS('Unknown')).toBe('TENTATIVE');
  });
});

// ---------------------------------------------------------------------------
// formatICSDDate
// ---------------------------------------------------------------------------

describe('formatICSDDate', () => {
  it('formats a date to YYYYMMDD', () => {
    const date = new Date(2026, 4, 10); // May 10, 2026
    expect(formatICSDDate(date)).toBe('20260510');
  });

  it('pads single-digit month and day', () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026
    expect(formatICSDDate(date)).toBe('20260105');
  });

  it('handles December dates', () => {
    const date = new Date(2026, 11, 25); // Dec 25, 2026
    expect(formatICSDDate(date)).toBe('20261225');
  });
});

// ---------------------------------------------------------------------------
// milestonesToICS — VCALENDAR structure
// ---------------------------------------------------------------------------

describe('milestonesToICS — VCALENDAR structure', () => {
  it('starts with BEGIN:VCALENDAR and ends with END:VCALENDAR', () => {
    const ics = milestonesToICS([makeMilestone()]);
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines[lines.length - 1]).toBe('END:VCALENDAR');
  });

  it('includes VERSION:2.0', () => {
    const ics = milestonesToICS([makeMilestone()]);
    expect(ics).toContain('VERSION:2.0');
  });

  it('includes PRODID with default value', () => {
    const ics = milestonesToICS([makeMilestone()]);
    expect(ics).toContain('PRODID:-//TalentTrust//TalentTrust Milestones//EN');
  });

  it('accepts a custom PRODID override', () => {
    const ics = milestonesToICS([makeMilestone()], '-//Custom//App//EN');
    expect(ics).toContain('PRODID:-//Custom//App//EN');
  });

  it('includes CALSCALE:GREGORIAN', () => {
    const ics = milestonesToICS([makeMilestone()]);
    expect(ics).toContain('CALSCALE:GREGORIAN');
  });

  it('includes METHOD:PUBLISH', () => {
    const ics = milestonesToICS([makeMilestone()]);
    expect(ics).toContain('METHOD:PUBLISH');
  });

  it('uses CRLF line endings', () => {
    const ics = milestonesToICS([makeMilestone()]);
    expect(ics).toContain('\r\n');
  });

  it('returns only headers + footer for an empty array', () => {
    const ics = milestonesToICS([]);
    const lines = ics.split('\r\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(6); // VCALENDAR, VERSION, PRODID, CALSCALE, METHOD, END:VCALENDAR
  });
});

// ---------------------------------------------------------------------------
// milestonesToICS — VEVENT generation
// ---------------------------------------------------------------------------

describe('milestonesToICS — VEVENT generation', () => {
  it('creates a VEVENT block for each milestone with a due date', () => {
    const ics = milestonesToICS(sampleMilestones);
    const veventStarts = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(veventStarts).toBe(3);
  });

  it('skips milestones without a dueDate', () => {
    const milestones = [
      makeMilestone({ id: 'ms-001', dueDate: '2026-05-15' }),
      makeMilestone({ id: 'ms-002', dueDate: undefined }),
      makeMilestone({ id: 'ms-003', dueDate: '' }),
    ];
    const ics = milestonesToICS(milestones);
    const veventStarts = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(veventStarts).toBe(1);
  });

  it('skips milestones with invalid due dates', () => {
    const milestones = [
      makeMilestone({ id: 'ms-001', dueDate: 'not-a-date' }),
    ];
    const ics = milestonesToICS(milestones);
    const veventStarts = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(veventStarts).toBe(0);
  });

  it('each VEVENT contains UID', () => {
    const ics = milestonesToICS([makeMilestone({ id: 'ms-001' })]);
    expect(ics).toContain('UID:ms-001@talenttrust-milestones');
  });

  it('each VEVENT contains DTSTAMP', () => {
    const ics = milestonesToICS([makeMilestone()]);
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}/);
  });

  it('each VEVENT contains DTSTART;VALUE=DATE in YYYYMMDD format', () => {
    const ics = milestonesToICS([makeMilestone({ dueDate: '2026-05-15' })]);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260515');
  });

  it('each VEVENT contains SUMMARY with escaped title', () => {
    const ics = milestonesToICS([makeMilestone({ title: 'Test; Milestone, Feature\nNew' })]);
    expect(ics).toContain('SUMMARY:Test\\; Milestone\\, Feature\\nNew');
  });

it('each VEVENT contains DESCRIPTION with status', () => {
    const ics = milestonesToICS([makeMilestone({ status: 'Pending', title: 'Work' })]);
    expect(ics).toContain('DESCRIPTION:Status: Pending');
  });

  it('maps Completed status to STATUS:CONFIRMED', () => {
    const ics = milestonesToICS([makeMilestone({ status: 'Completed' })]);
    expect(ics).toContain('STATUS:CONFIRMED');
  });

  it('maps Pending status to STATUS:TENTATIVE', () => {
    const ics = milestonesToICS([makeMilestone({ status: 'Pending' })]);
    expect(ics).toContain('STATUS:TENTATIVE');
  });

  it('each VEVENT closes with END:VEVENT', () => {
    const ics = milestonesToICS([makeMilestone()]);
    expect(ics).toContain('END:VEVENT');
  });

  it('properly nests VEVENT between BEGIN and END', () => {
    const ics = milestonesToICS([makeMilestone()]);
    const veventMatch = ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/);
    expect(veventMatch).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// milestonesToICS — integration
// ---------------------------------------------------------------------------

describe('milestonesToICS — integration', () => {
  it('produces valid ICS structure with multiple milestones', () => {
    const ics = milestonesToICS(sampleMilestones);
    const lines = ics.split('\r\n').filter((l) => l.length > 0);

    // Structure should be:
    // BEGIN:VCALENDAR, VERSION, PRODID, CALSCALE, METHOD,
    //   BEGIN:VEVENT ... END:VEVENT (×3),
    // END:VCALENDAR
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines[lines.length - 1]).toBe('END:VCALENDAR');

    // Count VEVENT blocks
    const veventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(veventCount).toBe(3);
  });

  it('uses parseLocalDate via dueSoon.ts for date conversion', () => {
    // This test verifies that the date is correctly parsed as local time.
    // The due date "2026-05-15" should produce DTSTART;VALUE=DATE:20260515.
    const ics = milestonesToICS([makeMilestone({ dueDate: '2026-05-15' })]);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260515');
  });
});

// ---------------------------------------------------------------------------
// downloadMilestonesICS — download trigger
// ---------------------------------------------------------------------------

describe('downloadMilestonesICS', () => {
  let createObjectURLMock: jest.Mock;
  let revokeObjectURLMock: jest.Mock;
  let appendChildSpy: jest.SpyInstance;
  let removeChildSpy: jest.SpyInstance;
  let clickSpy: jest.Mock;

  beforeEach(() => {
    createObjectURLMock = jest.fn().mockReturnValue('blob:fake-ics-url');
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
    downloadMilestonesICS(sampleMilestones);
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(createObjectURLMock.mock.calls[0][0]).toBeInstanceOf(Blob);
  });

  it('creates a Blob with text/calendar mime type', () => {
    downloadMilestonesICS(sampleMilestones);
    const blob = createObjectURLMock.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/calendar');
  });

  it('sets the anchor href to the object URL', () => {
    downloadMilestonesICS(sampleMilestones);
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.href).toContain('blob:fake-ics-url');
  });

  it('sets the anchor download attribute to the provided filename', () => {
    downloadMilestonesICS(sampleMilestones);
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('milestones.ics');
  });

  it('accepts a custom filename', () => {
    downloadMilestonesICS(sampleMilestones, 'my-calendar.ics');
    const anchor = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('my-calendar.ics');
  });

  it('appends then removes the anchor from the body', () => {
    downloadMilestonesICS(sampleMilestones);
    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledTimes(1);
  });

  it('clicks the anchor to trigger the download', () => {
    downloadMilestonesICS(sampleMilestones);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('revokes the object URL after download', () => {
    downloadMilestonesICS(sampleMilestones);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:fake-ics-url');
  });

  it('works with an empty array (no VEVENT blocks)', () => {
    expect(() => downloadMilestonesICS([])).not.toThrow();
  });

  it('works with milestones that have no due dates', () => {
    const noDueDates = [
      makeMilestone({ id: 'ms-001', dueDate: undefined }),
      makeMilestone({ id: 'ms-002', dueDate: '' }),
    ];
    expect(() => downloadMilestonesICS(noDueDates)).not.toThrow();
    // Should still generate a valid calendar with no VEVENTs.
    // Can't easily test content of Blob, but at minimum no error is thrown
  });
});

