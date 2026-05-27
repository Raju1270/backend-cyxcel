import { BadRequestException } from '@nestjs/common';
import { RiskCategorySlugs } from '../../../common/utils/risk-category-slugs.enum';
import { normalizeColumnName } from '../utils/row-parser.util';

type LatestPerilLikelihoodRow = {
  Title: string;
  [key: `EU ${string}`]: string | number | undefined;
  [key: `US ${string}`]: string | number | undefined;
  [key: `UK ${string}`]: string | number | undefined;
};

/**
 * Get allowed risk category sheets
 */
export function getAllowedSheets(): RiskCategorySlugs[] {
  return [
    RiskCategorySlugs.AI,
    RiskCategorySlugs.CORPORATE,
    RiskCategorySlugs.CYBER,
    RiskCategorySlugs.GEOPOLITICAL,
    RiskCategorySlugs.LEGAL,
    RiskCategorySlugs.SUPPLY_CHAIN,
    RiskCategorySlugs.TECHNOLOGY,
  ];
}

/**
 * Filter workbook sheets to only allowed risk category sheets
 */
export function filterAllowedSheets(
  workbook: Record<string, unknown[]>,
): string[] {
  const allowedSheets = getAllowedSheets();
  const sheetsToProcess = Object.keys(workbook).filter((s) =>
    allowedSheets.includes(s as RiskCategorySlugs),
  );

  if (sheetsToProcess.length === 0) {
    throw new BadRequestException(
      'No valid risk category sheets found in the workbook',
    );
  }

  return sheetsToProcess;
}

/**
 * Check for missing sheets from allowed sheets
 */
export function findMissingSheets(
  workbook: Record<string, unknown[]>,
): string[] {
  const allowedSheets = getAllowedSheets();
  const allWorkbookSheets = Object.keys(workbook);
  return allowedSheets.filter((sheet) => !allWorkbookSheets.includes(sheet));
}

/**
 * Check if column exists in sheet headers
 */
export function checkColumnInSheet(
  rows: LatestPerilLikelihoodRow[],
  columnName: string,
): boolean {
  if (rows.length === 0) return false;
  const firstRow = rows[0];
  const rowKeys = Object.keys(firstRow);
  const normalizedColumnName = normalizeColumnName(columnName);
  return rowKeys.some(
    (key) => normalizeColumnName(key) === normalizedColumnName,
  );
}

/**
 * Validate required columns for a sheet
 */
export function validateRequiredColumnsForSheet(
  rows: LatestPerilLikelihoodRow[],
  sheetName: string,
  euColumn: string,
  usColumn: string,
  ukColumn: string,
): string[] {
  const warnings: string[] = [];

  if (rows.length === 0) return warnings;

  if (!checkColumnInSheet(rows, euColumn)) {
    warnings.push(
      `Required column '${euColumn}' not found in sheet '${sheetName}'`,
    );
  }
  if (!checkColumnInSheet(rows, usColumn)) {
    warnings.push(
      `Required column '${usColumn}' not found in sheet '${sheetName}'`,
    );
  }
  if (!checkColumnInSheet(rows, ukColumn)) {
    warnings.push(
      `Required column '${ukColumn}' not found in sheet '${sheetName}'`,
    );
  }

  return warnings;
}
