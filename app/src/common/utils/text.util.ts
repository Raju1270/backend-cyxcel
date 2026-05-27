/**
 * Normalize text for comparison:
 * - Trim whitespace
 * - Replace multiple spaces with single space
 * - Convert to lowercase for case-insensitive comparison
 */
export function normalizeTextForComparison(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple whitespace characters with single space
    .toLowerCase();
}
