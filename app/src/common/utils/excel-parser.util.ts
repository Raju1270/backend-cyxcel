import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

export type WorkbookData = Record<string, unknown[]>;

export function getWorkbookAsJson(filePath: string): WorkbookData {
  const fullPath = path.resolve(filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const workbook = XLSX.readFile(fullPath);
  const result: WorkbookData = {};

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    result[sheetName] = jsonData;
  });

  return result;
}

export function getWorkbookAsJsonFromBuffer(buffer: Buffer): WorkbookData {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const result: WorkbookData = {};

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    result[sheetName] = jsonData;
  });

  return result;
}

/**
 * Convert WorkbookData (parsed CSV/Excel data) to Excel buffer format
 * @param workbook - Parsed workbook data
 * @param sheetName - Name of the sheet to convert
 * @returns Excel buffer (xlsx format)
 */
export function convertWorkbookDataToExcelBuffer(
  workbook: WorkbookData,
  sheetName: string,
): Buffer {
  const sheetData = workbook[sheetName] || [];

  // Create new Excel workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Convert to buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
