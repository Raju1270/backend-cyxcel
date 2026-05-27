import { BadRequestException } from '@nestjs/common';
import { RiskOwnerRow } from '../types';
import {
  validateWorkbookHasData as validateWorkbookHasDataCommon,
  validateRequiredColumns as validateRequiredColumnsCommon,
} from '../../../common/validators/workbook.validator';

/**
 * Find the first sheet in workbook (for risk owners, we use the first sheet)
 */
export function findFirstSheet(workbook: Record<string, unknown[]>): string {
  const sheetNames = Object.keys(workbook);

  if (sheetNames.length === 0) {
    throw new BadRequestException('No sheets found in the workbook');
  }

  return sheetNames[0];
}

/**
 * Validate that workbook has data
 */
export function validateWorkbookHasData(
  rows: RiskOwnerRow[],
  sheetName: string,
): void {
  validateWorkbookHasDataCommon(rows, sheetName);
}

/**
 * Validate required columns exist in the first row
 */
export function validateRequiredColumns(
  firstRow: RiskOwnerRow,
  sheetName: string,
): string[] {
  const requiredColumns = [
    'Nature of Loss',
    'Primary (Operational functions that directly own & manage services and their associated risks)',
    'Secondary (Functions with oversight of management activity, separate from those responsible for delivery)',
  ];
  return validateRequiredColumnsCommon(firstRow, requiredColumns, sheetName);
}
