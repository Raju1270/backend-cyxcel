import { RiskOwnerRow } from '../types';

/**
 * Helper function to find column value case-insensitively
 */
export function getColumnValue(
  row: RiskOwnerRow,
  columnName: string,
): string | undefined {
  const rowKeys = Object.keys(row);
  const matchingKey = rowKeys.find(
    (key) => key.toLowerCase() === columnName.toLowerCase(),
  );
  return matchingKey ? row[matchingKey as keyof RiskOwnerRow] : undefined;
}

/**
 * Parse risk owner row and extract field values
 */
export function parseRiskOwnerRow(row: RiskOwnerRow) {
  const natureOfLoss = getColumnValue(row, 'Nature of Loss');
  const primary = getColumnValue(
    row,
    'Primary (Operational functions that directly own & manage services and their associated risks)',
  );
  const secondary = getColumnValue(
    row,
    'Secondary (Functions with oversight of management activity, separate from those responsible for delivery)',
  );

  return {
    natureOfLoss: natureOfLoss ? String(natureOfLoss).trim() : '',
    primary: primary ? String(primary).trim() : '',
    secondary: secondary ? String(secondary).trim() : '',
  };
}

/**
 * Split semicolon-separated string into array of trimmed values
 */
export function parseOwnersList(ownersString: string): string[] {
  if (!ownersString || ownersString.trim() === '') {
    return [];
  }
  return ownersString
    .split(';')
    .map((owner) => owner.trim())
    .filter((owner) => owner.length > 0);
}

/**
 * Check if row is empty or header row
 */
export function isEmptyOrHeaderRow(natureOfLoss: string | undefined): boolean {
  if (!natureOfLoss) {
    return true;
  }
  const trimmed = natureOfLoss.toString().trim();
  return trimmed === '' || trimmed.toLowerCase() === 'nature of loss';
}
