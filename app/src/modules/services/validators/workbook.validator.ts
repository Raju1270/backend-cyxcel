import { ServiceRow } from '../types';
import {
  findFirstSheet as findFirstSheetCommon,
  validateWorkbookHasData as validateWorkbookHasDataCommon,
  validateRequiredColumns as validateRequiredColumnsCommon,
} from '../../../common/validators/workbook.validator';

/**
 * Find the first sheet in workbook (for CSV, it will be the only sheet)
 */
export function findFirstSheet(workbook: Record<string, unknown[]>): string {
  return findFirstSheetCommon(workbook);
}

/**
 * Validate that workbook has data
 */
export function validateWorkbookHasData(
  rows: ServiceRow[],
  sheetName: string,
): void {
  validateWorkbookHasDataCommon(rows, sheetName);
}

/**
 * Validate required columns exist in the first row
 */
export function validateRequiredColumns(
  firstRow: ServiceRow,
  sheetName: string,
): string[] {
  const requiredColumns = [
    'Risk Categories',
    'PartnerName',
    'Title',
    'description',
    'link',
  ];
  return validateRequiredColumnsCommon(firstRow, requiredColumns, sheetName);
}
