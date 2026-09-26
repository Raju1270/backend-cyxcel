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

const MONTH_INDEX: Record<string, number> = {
  JANUARY: 0,
  FEBRUARY: 1,
  MARCH: 2,
  APRIL: 3,
  MAY: 4,
  JUNE: 5,
  JULY: 6,
  AUGUST: 7,
  SEPTEMBER: 8,
  OCTOBER: 9,
  NOVEMBER: 10,
  DECEMBER: 11,
};

/**
 * Column names to try for one region's likelihood, in priority order: the
 * target month's header (e.g. "EU AUGUST 2026"), the generic "EU LIKELIHOOD" /
 * "EU", then any OTHER month-suffixed header on the row, newest first. That
 * last step is what lets a sheet exported as "EU JULY 2026" be uploaded for
 * August without renaming its columns.
 */
export function getRegionColumnCandidates(
  row: LatestPerilLikelihoodRow,
  region: 'EU' | 'US' | 'UK',
  targetColumn: string,
): string[] {
  const otherMonths: { key: string; year: number; month: number }[] = [];
  for (const key of Object.keys(row)) {
    const match = /^(EU|US|UK) (\S+) (\d{4})$/.exec(normalizeColumnName(key));
    if (match && match[1] === region) {
      otherMonths.push({
        key,
        year: Number(match[3]),
        month: MONTH_INDEX[match[2]] ?? -1,
      });
    }
  }
  otherMonths.sort((a, b) => b.year - a.year || b.month - a.month);

  return [
    targetColumn,
    `${region} LIKELIHOOD`,
    region,
    ...otherMonths.map((c) => c.key),
  ];
}

/**
 * When neither the target month's column nor a generic one exists but another
 * month's does, returns that column's header (the one that will be read).
 */
export function findMonthFallbackColumn(
  row: LatestPerilLikelihoodRow,
  region: 'EU' | 'US' | 'UK',
  targetColumn: string,
): string | null {
  const candidates = getRegionColumnCandidates(row, region, targetColumn);
  if (anyColumnExists(row, candidates.slice(0, 3))) {
    return null;
  }
  return candidates[3] ?? null;
}

/**
 * Parse peril row and extract its title
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
