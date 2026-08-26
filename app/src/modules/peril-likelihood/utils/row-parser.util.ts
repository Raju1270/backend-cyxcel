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
 * Parse the "Nature of loss" column into a clean list of names.
 * Sheet stores it as a single comma-separated cell, e.g.
 * "Data Confidentiality Breach, Data Integrity Breach" -> two entries.
 * Matching against the DB (by name) happens in the service, not here -
 * this just does the raw split/trim/dedupe.
 */
export function parseNatureOfLoss(row: LatestPerilLikelihoodRow): string[] {
  const raw = getColumnValue(row, 'Nature of loss');
  if (!raw) {
    return [];
  }
  const names = String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return Array.from(new Set(names));
}

/**
 * Parse peril row and extract title + nature of loss
 */
export function parsePerilRow(row: LatestPerilLikelihoodRow) {
  const title = row.Title ? String(row.Title) : '';
  return {
    title: title.trim(),
    natureOfLoss: parseNatureOfLoss(row),
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
