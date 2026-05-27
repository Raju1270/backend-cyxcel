import { BadRequestException } from '@nestjs/common';
import { ArticleRow } from '../types';
import {
  validateWorkbookHasData as validateWorkbookHasDataCommon,
  validateRequiredColumns as validateRequiredColumnsCommon,
} from '../../../common/validators/workbook.validator';

/**
 * Find the 'Team' sheet in workbook (case-insensitive)
 */
export function findTeamSheet(workbook: Record<string, unknown[]>): string {
  const sheetNames = Object.keys(workbook);

  if (sheetNames.length === 0) {
    throw new BadRequestException('No sheets found in the workbook');
  }

  const sheetName = sheetNames.find((name) => name.toLowerCase() === 'team');
  if (!sheetName) {
    throw new BadRequestException(
      `Sheet 'Team' not found in the workbook. Available sheets: ${sheetNames.join(', ')}`,
    );
  }

  return sheetName;
}

/**
 * Validate that workbook has data
 */
export function validateWorkbookHasData(
  rows: ArticleRow[],
  sheetName: string,
): void {
  validateWorkbookHasDataCommon(rows, sheetName);
}

/**
 * Validate required columns exist in the first row
 */
export function validateRequiredColumns(
  firstRow: ArticleRow,
  sheetName: string,
): string[] {
  const requiredColumns = ['Risk Vertical', 'Title', 'Date', 'Link'];
  return validateRequiredColumnsCommon(firstRow, requiredColumns, sheetName);
}
