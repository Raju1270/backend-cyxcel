import { BadRequestException } from '@nestjs/common';

/**
 * Validates that workbook has data
 */
export function validateWorkbookHasData<T>(rows: T[], sheetName: string): void {
  if (rows.length === 0) {
    throw new BadRequestException(`No data found in sheet '${sheetName}'`);
  }
}

/**
 * Validates required columns exist in the first row
 */
export function validateRequiredColumns(
  firstRow: Record<string, unknown>,
  requiredColumns: string[],
  sheetName: string,
): string[] {
  const globalWarnings: string[] = [];
  const rowKeys = Object.keys(firstRow);

  requiredColumns.forEach((col) => {
    const found = rowKeys.some(
      (key) => key.toLowerCase() === col.toLowerCase(),
    );
    if (!found) {
      globalWarnings.push(
        `Required column '${col}' not found in sheet '${sheetName}'`,
      );
    }
  });

  return globalWarnings;
}

/**
 * Finds the first sheet in workbook (for CSV, it will be the only sheet)
 */
export function findFirstSheet(workbook: Record<string, unknown[]>): string {
  const sheetNames = Object.keys(workbook);

  if (sheetNames.length === 0) {
    throw new BadRequestException('No sheets found in the workbook');
  }

  return sheetNames[0];
}
