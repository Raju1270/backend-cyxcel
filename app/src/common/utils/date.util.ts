/**
 * Generate createdAt date from month and year
 * Format: YYYY-MM-02 (second day of the month)
 * @param month - Month as string (e.g., "1", "01", "12")
 * @param year - Year as string (e.g., "2024", "2025")
 * @returns Date object or current date if month/year are empty
 */
export function generateCreatedAt(month?: string, year?: string): Date {
  if (month && year) {
    // Format month with leading zero if needed (e.g., "01" instead of "1")
    const monthFormatted = month.padStart(2, '0');
    return new Date(`${year}-${monthFormatted}-02`);
  }
  return new Date(); // Default to current date if month/year are empty
}
