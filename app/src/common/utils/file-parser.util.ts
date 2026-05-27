import { WorkbookData } from './excel-parser.util';
import { getWorkbookAsJsonFromBuffer } from './excel-parser.util';
import { getCsvAsJsonFromBuffer } from './csv-parser.util';

/**
 * Heuristic to detect if buffer contains CSV content
 * Only checks if it's valid UTF-8 text, not binary Excel format
 */
export function isLikelyCsv(buffer: Buffer): boolean {
  try {
    // Excel files start with specific binary signatures
    // XLSX files start with PK (ZIP archive)
    // XLS files have specific binary headers
    if (buffer.length < 2) return false;

    // Check for Excel file signatures
    const firstBytes = buffer.slice(0, 2);
    const isXlsx = firstBytes[0] === 0x50 && firstBytes[1] === 0x4b; // PK (ZIP)
    const isXls = buffer[0] === 0xd0 && buffer[1] === 0xcf; // OLE2 header

    // If it's a binary Excel file, it's not CSV
    if (isXlsx || isXls) {
      return false;
    }

    // Otherwise, check if it's valid UTF-8 text with CSV patterns
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return false;

    // Check if first line contains commas (likely CSV header)
    const firstLine = lines[0];
    return firstLine.includes(',') && firstLine.split(',').length >= 2;
  } catch {
    return false;
  }
}

/**
 * Detect file type and parse accordingly
 * Returns WorkbookData in the same format regardless of input type
 */
export function parseFileBuffer(
  fileBuffer: Buffer,
  filename?: string,
): WorkbookData {
  // First check filename extension (most reliable)
  const filenameLower = filename?.toLowerCase() || '';
  const isCsvByExtension = filenameLower.endsWith('.csv');
  const isExcelByExtension =
    filenameLower.endsWith('.xlsx') || filenameLower.endsWith('.xls');

  // If filename indicates Excel, use Excel parser
  if (isExcelByExtension) {
    return getWorkbookAsJsonFromBuffer(fileBuffer);
  }

  // If filename indicates CSV, use CSV parser
  if (isCsvByExtension) {
    return getCsvAsJsonFromBuffer(fileBuffer);
  }

  // If no extension or ambiguous, use heuristics
  // Check for Excel file signatures first (more reliable)
  if (fileBuffer.length >= 2) {
    const firstBytes = fileBuffer.slice(0, 2);
    const isXlsx = firstBytes[0] === 0x50 && firstBytes[1] === 0x4b; // PK (ZIP)
    const isXls = fileBuffer[0] === 0xd0 && fileBuffer[1] === 0xcf; // OLE2 header

    if (isXlsx || isXls) {
      return getWorkbookAsJsonFromBuffer(fileBuffer);
    }
  }

  // Otherwise, try CSV parser
  if (isLikelyCsv(fileBuffer)) {
    return getCsvAsJsonFromBuffer(fileBuffer);
  }

  // Default to Excel parser (most common case)
  return getWorkbookAsJsonFromBuffer(fileBuffer);
}
