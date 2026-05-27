import { ServiceRow } from '../types';

/**
 * Helper function to find column value case-insensitively
 */
export function getColumnValue(
  row: ServiceRow,
  columnName: string,
): string | undefined {
  const rowKeys = Object.keys(row);
  const matchingKey = rowKeys.find(
    (key) => key.toLowerCase() === columnName.toLowerCase(),
  );
  return matchingKey ? row[matchingKey as keyof ServiceRow] : undefined;
}

/**
 * Parse service row and extract field values
 */
export function parseServiceRow(row: ServiceRow) {
  const title = getColumnValue(row, 'Title');
  const riskCategories = getColumnValue(row, 'Risk Categories');
  const partnerName = getColumnValue(row, 'PartnerName');
  const description = getColumnValue(row, 'description');
  const link = getColumnValue(row, 'link');

  return {
    title: title ? String(title) : '',
    riskCategories: riskCategories ? String(riskCategories) : '',
    partnerName: partnerName ? String(partnerName) : '',
    description: description ? String(description) : '',
    link: link ? String(link) : '',
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
