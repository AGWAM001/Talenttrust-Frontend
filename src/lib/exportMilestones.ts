import type { Milestone } from '@/types/domain';

function escapeCSV(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(milestones: Milestone[]): string {
  const headers = ['ID', 'Title', 'Status', 'Payout', 'Currency', 'Due Date', 'Contract ID'];
  const rows = milestones.map((m) =>
    [
      escapeCSV(m.id),
      escapeCSV(m.title),
      escapeCSV(m.status),
      escapeCSV(m.payout),
      escapeCSV(m.currency),
      escapeCSV(m.dueDate ?? ''),
      escapeCSV(m.contractId ?? ''),
    ].join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportMilestonesToCSV(
  milestones: Milestone[],
  filename = 'milestones.csv',
): void {
  downloadBlob(toCSV(milestones), filename, 'text/csv;charset=utf-8;');
}

export function exportMilestonesToJSON(
  milestones: Milestone[],
  filename = 'milestones.json',
): void {
  downloadBlob(
    JSON.stringify(milestones, null, 2),
    filename,
    'application/json;charset=utf-8;',
  );
}
