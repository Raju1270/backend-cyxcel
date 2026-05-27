import { ArticleRow } from '../types';

/**
 * Helper function to find column value case-insensitively
 */
export function getColumnValue(
  row: ArticleRow,
  columnName: string,
): string | undefined {
  const rowKeys = Object.keys(row);
  const matchingKey = rowKeys.find(
    (key) => key.toLowerCase() === columnName.toLowerCase(),
  );
  return matchingKey ? row[matchingKey as keyof ArticleRow] : undefined;
}

/**
 * Parse article row and extract field values
 */
export function parseArticleRow(row: ArticleRow) {
  const title = getColumnValue(row, 'Title');
  const riskVertical = getColumnValue(row, 'Risk Vertical');
  const dateStr = getColumnValue(row, 'Date');
  const link = getColumnValue(row, 'Link');

  return {
    title: title ? String(title) : '',
    riskVertical: riskVertical ? String(riskVertical) : '',
    dateStr: dateStr ? String(dateStr) : '',
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
