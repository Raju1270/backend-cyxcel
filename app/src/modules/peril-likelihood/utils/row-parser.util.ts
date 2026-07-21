type LatestPerilLikelihoodRow = {
  Title: string;
  [key: `EU ${string}`]: string | number | undefined;
  [key: `US ${string}`]: string | number | undefined;
  [key: `UK ${string}`]: string | number | undefined;
};

/**
 * Normalize column name by trimming whitespace, collapsing multiple spaces to single space, and converting to uppercase
 */
export function normalizeColumnName(columnName: string): string {
  return columnName.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Helper function to find column value case-insensitively
 */
export function getColumnValue(
  row: LatestPerilLikelihoodRow,
  columnName: string,
): unknown {
  const rowKeys = Object.keys(row);
  const normalizedColumnName = normalizeColumnName(columnName);
  const matchingKey = rowKeys.find(
    (key) => normalizeColumnName(key) === normalizedColumnName,
  );
  return matchingKey
    ? row[matchingKey as keyof LatestPerilLikelihoodRow]
    : undefined;
}

/**
 * Check if column exists in row
 */
export function columnExists(
  row: LatestPerilLikelihoodRow,
  columnName: string,
): boolean {
  const rowKeys = Object.keys(row);
  const normalizedColumnName = normalizeColumnName(columnName);
  return rowKeys.some(
    (key) => normalizeColumnName(key) === normalizedColumnName,
  );
}

/**
 * Parse peril row and extract title
 */
export function parsePerilRow(row: LatestPerilLikelihoodRow) {
  const title = row.Title ? String(row.Title) : '';
  return {
    title: title.trim(),
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
