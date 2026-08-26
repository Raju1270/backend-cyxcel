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
 * Helper function to find the first matching column value from a list of candidates.
 */
export function getFirstColumnValue(
  row: LatestPerilLikelihoodRow,
  columnNames: string[],
): unknown {
  for (const columnName of columnNames) {
    const value = getColumnValue(row, columnName);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
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
 * Check if any column from a list exists in row.
 */
export function anyColumnExists(
  row: LatestPerilLikelihoodRow,
  columnNames: string[],
): boolean {
  return columnNames.some((columnName) => columnExists(row, columnName));
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
