/**
 * exportDialogs.ts
 *
 * Client-side CSV and JSON export helpers for the dialogs view.
 * All CSV values are safely escaped to prevent formula injection and handle
 * embedded commas, quotes, and newlines.
 *
 * No server round-trip is required — exports are generated in-browser and
 * triggered as file downloads via a temporary anchor element.
 */

export type DialogStatus = 'All' | 'Open' | 'Closed' | 'Pending';

export interface DialogRecord {
  id: string;
  title: string;
  description: string;
  status: Exclude<DialogStatus, 'All'>;
  createdAt: string;
  resolvedAt?: string | null;
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/**
 * Safely escape a single CSV field value.
 *
 * Rules applied (RFC 4180):
 *  - Null / undefined → empty string.
 *  - If the value contains a comma, double-quote, newline, or carriage-return
 *    the entire field is wrapped in double-quotes and any embedded double-quotes
 *    are doubled ("").
 *  - Leading `=`, `+`, `-`, `@` are prefixed with a tab character to neutralise
 *    CSV formula injection (defensive measure for spreadsheet consumers).
 */
export function csvEscape(value: unknown): string {
  const raw = value == null ? '' : String(value);

  // Neutralise spreadsheet formula injection
  const safe =
    raw.length > 0 && ['=', '+', '-', '@'].includes(raw[0])
      ? `\t${raw}`
      : raw;

  // Quote the field if it contains characters that require quoting
  if (
    safe.includes('"') ||
    safe.includes(',') ||
    safe.includes('\n') ||
    safe.includes('\r')
  ) {
    return '"' + safe.replace(/"/g, '""') + '"';
  }

  return safe;
}

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

const CSV_HEADERS: Array<keyof DialogRecord | 'resolvedAt'> = [
  'id',
  'title',
  'description',
  'status',
  'createdAt',
  'resolvedAt',
];

/**
 * Serialise an array of DialogRecord objects to CSV string.
 *
 * @param dialogs - Array of dialog records (already filtered by the caller).
 * @returns A UTF-8 CSV string with a header row followed by one data row per dialog.
 */
export function dialogsToCsv(dialogs: DialogRecord[]): string {
  const headerRow = CSV_HEADERS.map(csvEscape).join(',');

  const dataRows = dialogs.map((d) =>
    [
      csvEscape(d.id),
      csvEscape(d.title),
      csvEscape(d.description),
      csvEscape(d.status),
      csvEscape(d.createdAt),
      csvEscape(d.resolvedAt ?? ''),
    ].join(','),
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Serialise an array of DialogRecord objects to a pretty-printed JSON string.
 *
 * @param dialogs - Array of dialog records (already filtered by the caller).
 */
export function dialogsToJson(dialogs: DialogRecord[]): string {
  return JSON.stringify(dialogs, null, 2);
}

// ---------------------------------------------------------------------------
// Download trigger
// ---------------------------------------------------------------------------

/**
 * Triggers a client-side file download without a server round-trip.
 *
 * Creates a temporary in-memory Blob URL, clicks a hidden anchor element, and
 * immediately revokes the URL to free memory.
 *
 * @param content  - The file content as a string.
 * @param filename - Suggested download filename.
 * @param mimeType - MIME type of the content (e.g. `"text/csv;charset=utf-8;"`).
 */
export function triggerDownload(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Public download API
// ---------------------------------------------------------------------------

/**
 * Convert `dialogs` to CSV and trigger a browser download.
 *
 * @param dialogs  - The currently visible (already-filtered) dialog records.
 * @param filename - Defaults to `"dialogs.csv"`.
 */
export function downloadDialogsCsv(
  dialogs: DialogRecord[],
  filename = 'dialogs.csv',
): void {
  triggerDownload(dialogsToCsv(dialogs), filename, 'text/csv;charset=utf-8;');
}

/**
 * Convert `dialogs` to JSON and trigger a browser download.
 *
 * @param dialogs  - The currently visible (already-filtered) dialog records.
 * @param filename - Defaults to `"dialogs.json"`.
 */
export function downloadDialogsJson(
  dialogs: DialogRecord[],
  filename = 'dialogs.json',
): void {
  triggerDownload(
    dialogsToJson(dialogs),
    filename,
    'application/json;charset=utf-8;',
  );
}
