import { WorkbookData } from './excel-parser.util';

/**
 * Parse CSV buffer and convert to WorkbookData format
 * CSV files are treated as a single "Team" sheet
 * Properly handles multi-line quoted fields
 */
export function getCsvAsJsonFromBuffer(buffer: Buffer): WorkbookData {
  const csvContent = buffer.toString('utf-8');

  if (!csvContent || csvContent.trim().length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse CSV rows properly handling multi-line quoted fields
  const rows = parseCsvRows(csvContent);

  if (rows.length === 0) {
    throw new Error('No data found in CSV file');
  }

  // First row is headers
  const headers = rows[0];

  if (headers.length === 0) {
    throw new Error('CSV file has no headers');
  }

  // Parse data rows
  const dataRows: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];

    // Skip empty rows
    if (values.every((v) => !v || v.trim().length === 0)) {
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    dataRows.push(row);
  }

  // Return in the same format as Excel parser (with "Team" sheet)
  const result: WorkbookData = {
    Team: dataRows as unknown[],
  };

  return result;
}

/**
 * Parse CSV content into rows, properly handling multi-line quoted fields
 * This function correctly handles newlines inside quoted fields
 */
function parseCsvRows(csvContent: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote (double quote)
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator (only outside quotes)
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (
      (char === '\n' || (char === '\r' && nextChar === '\n')) &&
      !inQuotes
    ) {
      // Row separator (only outside quotes)
      // Handle both \n and \r\n
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n after \r
      }

      // Add current field to row
      currentRow.push(currentField.trim());
      currentField = '';

      // Add row if it has any non-empty fields
      if (currentRow.some((field) => field.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      // Regular character (including newlines inside quoted fields)
      currentField += char;
    }
  }

  // Add last field and row
  if (currentField.trim().length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
  }
  if (
    currentRow.length > 0 &&
    currentRow.some((field) => field.trim().length > 0)
  ) {
    rows.push(currentRow);
  }

  return rows;
}
