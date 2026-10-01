import type { Contract } from '@/types/domain';

function csvEscape(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function partiesToString(parties: Contract['parties']): string {
  return parties.map((p) => `${p.label} (${p.address})`).join('; ');
}

function contractsToRows(contracts: Contract[]): string[][] {
  return contracts.map((c) => [
    c.contractName,
    partiesToString(c.parties),
    String(c.totalValue),
    c.currency,
    c.status,
    c.createdAt,
    String(c.milestoneCount),
  ]);
}

export function contractsToCsv(contracts: Contract[]): string {
  const headers = [
    'contractName',
    'parties',
    'totalValue',
    'currency',
    'status',
    'createdAt',
    'milestoneCount',
  ];

  const rows = contractsToRows(contracts);
  const lines = [headers.map(csvEscape).join(',')];

  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }

  return lines.join('\n');
}

export function contractsToJson(contracts: Contract[]): string {
  return JSON.stringify(contracts, null, 2);
}

export function triggerDownload(content: string, filename: string, mimeType: string): void {
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

export function downloadContractsCsv(contracts: Contract[]): void {
  const csv = contractsToCsv(contracts);
  triggerDownload(csv, 'contracts.csv', 'text/csv;charset=utf-8;');
}

export function downloadContractsJson(contracts: Contract[]): void {
  const json = contractsToJson(contracts);
  triggerDownload(json, 'contracts.json', 'application/json;charset=utf-8;');
}
