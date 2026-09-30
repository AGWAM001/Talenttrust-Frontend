# ICS (iCalendar) Export for Milestones

## Purpose

The `icsExport` helpers generate an RFC 5545 compliant `.ics` file from an array of milestones and trigger a client-side download. This lets freelancers import their milestone deadlines into any calendar application (Google Calendar, Apple Calendar, Outlook, etc.) without manual data entry.

---

## Module Location

**`src/lib/icsExport.ts`**

---

## Public API

### `milestonesToICS(milestones, prodId?)`

Generate a complete `.ics` calendar string from an array of milestones.

```typescript
function milestonesToICS(
  milestones: Milestone[],
  prodId?: string,
): string
```

**Parameters:**
- `milestones` — Array of milestone records. Milestones without a `dueDate` are silently skipped.
- `prodId` — Optional PRODID override (default: `-//TalentTrust//TalentTrust Milestones//EN`).

**Returns:** A UTF-8 string conforming to RFC 5545 with `\r\n` line endings.

**ICS structure produced:**
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TalentTrust//TalentTrust Milestones//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:ms-001@talenttrust-milestones
DTSTAMP:20260515T120000
DTSTART;VALUE=DATE:20260515
SUMMARY:Project Kickoff
DESCRIPTION:Status: Pending
STATUS:TENTATIVE
END:VEVENT
END:VCALENDAR
```

### `downloadMilestonesICS(milestones, filename?)`

Convert milestones to ICS and trigger a browser download.

```typescript
function downloadMilestonesICS(
  milestones: Milestone[],
  filename?: string,
): void
```

**Parameters:**
- `milestones` — Array of milestone records to export. Items without `dueDate` are skipped.
- `filename` — Optional download filename (default: `milestones.ics`).

**Download mechanics:**
1. Calls `milestonesToICS()` to produce the calendar string.
2. Wraps the string in a `Blob` with `text/calendar` MIME type.
3. Creates a temporary object URL via `URL.createObjectURL()`.
4. Programmatically clicks a hidden `<a>` element to trigger the browser's save dialog.
5. Immediately revokes the object URL to free memory.

---

## Key Design Decisions

### Date-only values (DTSTART;VALUE=DATE)

ICS events use `DTSTART;VALUE=DATE` with a `YYYYMMDD` date format. There is no time component and no timezone — the event appears on the correct day in any calendar application, regardless of the viewer's local timezone.

This is consistent with how the rest of the application handles dates (see `src/lib/dueSoon.ts` — `parseLocalDate`).

### Reuse of `parseLocalDate`

The `parseLocalDate` function from `src/lib/dueSoon.ts` is used to parse milestone due dates. This ensures:
- `YYYY-MM-DD` strings are parsed as local dates without UTC-to-local shifts.
- Invalid or unparseable dates return `null`, and those milestones are skipped.

### Status mapping

Milestone statuses are mapped to ICS-compatible values:

| Milestone Status | ICS STATUS    |
|-----------------|---------------|
| Completed       | `CONFIRMED`   |
| Paid            | `CONFIRMED`   |
| Pending         | `TENTATIVE`   |
| Active          | `TENTATIVE`   |
| Disputed        | `TENTATIVE`   |

### Text escaping (RFC 5545 Section 3.3.11)

Special characters in milestone titles and descriptions are escaped:

| Character | Escaped Form |
|-----------|-------------|
| `\`       | `\\`        |
| `;`       | `\;`        |
| `,`       | `\,`        |
| newline   | `\n`        |

### Stable UIDs

Each VEVENT gets a deterministic UID in the format `{milestone-id}@talenttrust-milestones`. This prevents duplicate events when re-importing the same milestones.

### Skip milestones without due dates

Milestones that have no `dueDate` or an empty/invalid `dueDate` are silently excluded from the calendar. No error is raised.

---

## Usage Example

```typescript
import { downloadMilestonesICS } from '@/lib/icsExport';
import type { Milestone } from '@/components/MilestonesList';

const milestones: Milestone[] = [
  { id: '1', title: 'Kickoff', status: 'Pending', payout: 2500, currency: 'USD', dueDate: '2026-05-15' },
  { id: '2', title: 'Design',  status: 'Pending', payout: 1500, currency: 'USD', dueDate: '2026-06-01' },
];

// Download with default filename "milestones.ics"
downloadMilestonesICS(milestones);

// Download with custom filename
downloadMilestonesICS(milestones, 'project-milestones.ics');
```

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Empty array | Returns a valid VCALENDAR with no VEVENTs |
| All milestones missing dueDate | Returns a valid VCALENDAR with no VEVENTs |
| Invalid dueDate string | Milestone is skipped silently |
| Special chars in title | Properly escaped per RFC 5545 |
| Multiple milestones | One VEVENT per milestone with due date |

---

## Test Coverage

Tests are in `src/lib/__tests__/icsExport.test.ts` and cover:

- Text escaping (backslash, semicolon, comma, newline, combined)
- Status-to-ICS mapping (all statuses + unknown)
- Date formatting (YYYYMMDD, padding, edge months)
- VCALENDAR structure (BEGIN/END, VERSION, PRODID, CALSCALE, METHOD)
- VEVENT generation (UID, DTSTAMP, DTSTART, SUMMARY, DESCRIPTION, STATUS)
- Milestone filtering (skip no-dueDate, skip invalid dueDate)
- Download trigger (Blob creation, URL lifecycle, anchor interaction)
- Empty and edge-case inputs

