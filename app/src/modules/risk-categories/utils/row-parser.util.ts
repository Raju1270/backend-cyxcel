import { RiskCategoryRow } from '../types';

/**
 * Helper function to find column value case-insensitively
 */
export function getColumnValue(
  row: RiskCategoryRow,
  columnName: string,
): string | undefined {
  const rowKeys = Object.keys(row);
  const matchingKey = rowKeys.find(
    (key) => key.toLowerCase() === columnName.toLowerCase(),
  );
  return matchingKey ? row[matchingKey as keyof RiskCategoryRow] : undefined;
}

/**
 * Parse risk category row and extract field values
 */
export function parseRiskCategoryRow(row: RiskCategoryRow) {
  const title = getColumnValue(row, 'Title');

  return {
    title: title ? String(title) : '',
  };
}

/**
 * Check if row is empty or header row
 */
export function isEmptyOrHeaderRow(title: string | undefined): boolean {
  if (!title) {
    return true;
  }
  const trimmed = title.toString().trim();
  return trimmed === '' || trimmed.toLowerCase() === 'title';
}
