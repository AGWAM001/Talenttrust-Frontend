// Utility to trigger client-side file download
export const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Escape special characters for CSV fields
export const escapeCsvValue = (val: unknown): string => {
  if (val === null || val === undefined) return '""';
  let stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
  stringVal = stringVal.replace(/"/g, '""');
  return `"${stringVal}"`;
};

// Convert array of objects to CSV
export const convertToCsv = (data: Record<string, unknown>[]): string => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const headerRow = headers.map(escapeCsvValue).join(',');
  
  const rows = data.map((row) =>
    headers.map((header) => escapeCsvValue(row[header])).join(',')
  );
  
  return [headerRow, ...rows].join('\n');
};

// Main export handler
export const exportData = (
  data: Record<string, unknown>[],
  filename: string,
  format: 'csv' | 'json'
) => {
  if (!data || data.length === 0) {
    console.warn('No data available to export.');
    return;
  }

  if (format === 'json') {
    const jsonString = JSON.stringify(data, null, 2);
    downloadFile(jsonString, `${filename}.json`, 'application/json');
  } else if (format === 'csv') {
    const csvString = convertToCsv(data);
    downloadFile(csvString, `${filename}.csv`, 'text/csv;charset=utf-8;');
  }
};