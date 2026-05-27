import { BadRequestException } from '@nestjs/common';
import { RiskCategoryRow } from '../types';
import {
  validateWorkbookHasData as validateWorkbookHasDataCommon,
  validateRequiredColumns as validateRequiredColumnsCommon,
} from '../../../common/validators/workbook.validator';

/**
 * Find the 'Tier 1 Loss Data Sheet' sheet in workbook (case-insensitive)
 */
export function findTier1LossDataSheet(
  workbook: Record<string, unknown[]>,
): string {
  const sheetNames = Object.keys(workbook);

  if (sheetNames.length === 0) {
    throw new BadRequestException('No sheets found in the workbook');
  }

  const sheetName = sheetNames.find(
    (name) => name.toLowerCase() === 'tier 1 loss data sheet',
  );
  if (!sheetName) {
    throw new BadRequestException(
      `Sheet 'Tier 1 Loss Data Sheet' not found in the workbook. Available sheets: ${sheetNames.join(', ')}`,
    );
  }

  return sheetName;
}

/**
 * Validate that workbook has data
 */
export function validateWorkbookHasData(
  rows: RiskCategoryRow[],
  sheetName: string,
): void {
  validateWorkbookHasDataCommon(rows, sheetName);
}

/**
 * Validate required columns exist in the first row
 * Note: For Tier 1 Loss Data Sheet, we don't require specific columns
 * as the structure is multi-vertical with different column layouts per vertical
 */
export function validateRequiredColumns(
  firstRow: RiskCategoryRow,
  sheetName: string,
): string[] {
  // No specific column requirements for multi-vertical structure
  return [];
}
