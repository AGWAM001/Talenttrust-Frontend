/**
 * icsExport.ts
 *
 * Client-side ICS (iCalendar) export for milestones. Generates an RFC 5545
 * compliant .ics file from milestone data and triggers a browser download.
 *
 * Each milestone with a due date becomes a VEVENT with a DATE-only start
 * (no time, no timezone — DTSTART;VALUE=Date) so the event appears on the
 * correct day regardless of the user's local time zone.
 *
 * Reuses parseLocalDate from dueSoon.ts for consistent date handling.
 */

import { parseLocalDate } from './dueSoon';
import type { Milestone } from '@/components/MilestonesList';

// ---------------------------------------------------------------------------
// ICS text escaping (RFC 5545 Section 3.3.11)
// ---------------------------------------------------------------------------

/**
 * Escape text values per RFC 5545.
 *
 * Rules:
 *  - Backslash  (\) → \\  (double backslash)
 *  - Semicolon   (;) → \;
 *  - Comma       (,) → \,
 *  - Newline    (\n) → \n (literal backslash + n)
 */
export function escapeICSText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// ---------------------------------------------------------------------------
// ICS status mapping
// ---------------------------------------------------------------------------

/**
 * Map a milestone status to an iCalendar STATUS value.
 *
 * RFC 5545 defines: TENTATIVE, CONFIRMED, CANCELLED.
 * We map meaningful equivalents:
 *  - Completed → CONFIRMED
 *  - Paid      → CONFIRMED
 *  - Pending   → TENTATIVE
 *  - Active    → TENTATIVE
 *  - Disputed  → TENTATIVE (calendar has no "disputed" status)
 *
 * @param status - The milestone's status string.
 * @returns An ICS-compatible STATUS value.
 */
export function milestoneStatusToICS(status: string): string {
  switch (status) {
    case 'Completed':
    case 'Paid':
      return 'CONFIRMED';
    default:
      return 'TENTATIVE';
  }
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

/**
 * Format a Date object to an ICS DATE-only value (YYYYMMDD).
 *
 * Uses the Date's local year/month/day so the date does not shift across
 * time zones. This aligns with the DTSTART;VALUE=DATE format which is
 * intentionally timezone-agnostic.
 */
export function formatICSDDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// ---------------------------------------------------------------------------
// ICS generation — core
// ---------------------------------------------------------------------------

/**
 * Generate an RFC 5545 VCALENDAR string from an array of milestones.
 *
 * Milestones without a dueDate are skipped. The resulting calendar uses
 * DATE-only values (DTSTART;VALUE=DATE) so events stay pinned to the correct
 * day irrespective of the reader's local time.
 *
 * @param milestones - Array of milestone records to export.
 * @param prodId     - Optional PRODID override (defaults to a descriptive ID).
 * @returns A complete .ics file content string.
 */
export function milestonesToICS(
  milestones: Milestone[],
  prodId = '-//TalentTrust//TalentTrust Milestones//EN',
): string {
  const now = new Date();
  const dtstamp = formatICSDDate(now) + 'T' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const milestone of milestones) {
    if (!milestone.dueDate) continue;

    const parsed = parseLocalDate(milestone.dueDate);
    if (!parsed) continue;

    const dtstart = formatICSDDate(parsed);
    const summary = escapeICSText(milestone.title);
    const description = escapeICSText(`Status: ${milestone.status}`);
    const icsStatus = milestoneStatusToICS(milestone.status);

    // Build a deterministic UID from the milestone id and a domain suffix
    // so re-exports of the same milestone produce a stable identifier.
    const uid = `${milestone.id}@talenttrust-milestones`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `STATUS:${icsStatus}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');

  // RFC 5545 requires lines to be delimited by CRLF
  return lines.join('\r\n');
}

// ---------------------------------------------------------------------------
// Browser download trigger
// ---------------------------------------------------------------------------

/**
 * Trigger a browser download of an ICS file from milestones.
 *
 * Creates an in-memory Blob from the ICS content, generates a temporary
 * object URL, clicks a hidden anchor element, and immediately revokes the
 * URL to free memory.
 *
 * Milestones without a due date are silently skipped.
 *
 * @param milestones - The milestones to include in the .ics file.
 * @param filename   - Suggested download filename (default: "milestones.ics").
 */
export function downloadMilestonesICS(
  milestones: Milestone[],
  filename = 'milestones.ics',
): void {
  const content = milestonesToICS(milestones);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

