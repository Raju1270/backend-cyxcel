/**
 * Validates that a date is valid and within a reasonable range
 * @param date The date to validate
 * @param minYear Minimum allowed year (default: 1900)
 * @param maxYear Maximum allowed year (default: 2100)
 * @returns true if the date is valid and within range
 */
export function isValidDateRange(
  date: Date,
  minYear: number = 1900,
  maxYear: number = 2100,
): boolean {
  if (isNaN(date.getTime())) {
    return false;
  }
  const year = date.getFullYear();
  return year >= minYear && year <= maxYear;
}

/**
 * Convert Excel serial number to JavaScript Date
 * Excel stores dates as number of days since January 1, 1900
 * @param serialNumber Excel serial number
 * @returns JavaScript Date object
 */
function excelSerialToDate(serialNumber: number): Date {
  // Excel serial number 1 = January 1, 1900
  // Excel serial number 25569 = January 1, 1970 (Unix epoch)
  // Standard conversion formula: JavaScript Date = (Excel Serial - 25569) * 86400000
  // This accounts for Excel's incorrect treatment of 1900 as a leap year
  const excelEpochSerial = 25569; // Excel serial for January 1, 1970
  const millisecondsPerDay = 86400000;
  const unixTimestamp = (serialNumber - excelEpochSerial) * millisecondsPerDay;
  return new Date(unixTimestamp);
}

/**
 * Parse date string in various formats (MM/DD/YYYY, "Oct 7, 25", Excel serial numbers, etc.)
 * @param dateStr Date string to parse (can also be a number string representing Excel serial number)
 * @returns Parsed Date object or null if invalid
 */
export function parseArticleDate(dateStr: string): Date | null {
  try {
    const normalizedDateStr = dateStr.trim();

    // Handle Excel serial numbers (e.g., "45937" which represents a date)
    // Excel serial numbers are typically 5-6 digit numbers (dates from 1900-2100)
    // Check if the string is a pure number that could be an Excel serial number
    const numericValue = Number(normalizedDateStr);
    if (
      !isNaN(numericValue) &&
      isFinite(numericValue) &&
      normalizedDateStr.match(/^\d+$/)
    ) {
      // Excel serial numbers for dates are typically between 1 (Jan 1, 1900) and ~73050 (Dec 31, 2099)
      // But we'll be more lenient and accept reasonable ranges
      if (numericValue >= 1 && numericValue <= 100000) {
        const excelDate = excelSerialToDate(numericValue);
        if (isValidDateRange(excelDate)) {
          return excelDate;
        }
      }
    }

    // Handle MM/DD/YYYY format (e.g., "10/07/2025")
    const mmddyyyyMatch = normalizedDateStr.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    );
    if (mmddyyyyMatch) {
      const month = parseInt(mmddyyyyMatch[1], 10);
      const day = parseInt(mmddyyyyMatch[2], 10);
      const year = parseInt(mmddyyyyMatch[3], 10);

      // Validate month and day ranges
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
      }

      const publishedDate = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
      if (!isValidDateRange(publishedDate)) {
        return null;
      }
      return publishedDate;
    }

    // Handle DD-MMM-YY format (e.g., "24-Jul-25")
    const ddmmyyMatch = normalizedDateStr.match(
      /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/,
    );
    if (ddmmyyMatch) {
      const day = parseInt(ddmmyyMatch[1], 10);
      const monthStr = ddmmyyMatch[2];
      const twoDigitYear = parseInt(ddmmyyMatch[3], 10);

      // Convert month abbreviation to number (0-indexed for Date constructor)
      const monthMap: Record<string, number> = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        may: 4,
        jun: 5,
        jul: 6,
        aug: 7,
        sep: 8,
        oct: 9,
        nov: 10,
        dec: 11,
      };
      const month = monthMap[monthStr.toLowerCase()];
      if (month === undefined) {
        return null;
      }

      // Assume years 00-50 are 2000-2050, years 51-99 are 1951-1999
      const fourDigitYear =
        twoDigitYear <= 50 ? 2000 + twoDigitYear : 1900 + twoDigitYear;

      // Validate day range
      if (day < 1 || day > 31) {
        return null;
      }

      const publishedDate = new Date(fourDigitYear, month, day);
      if (!isValidDateRange(publishedDate)) {
        return null;
      }
      return publishedDate;
    }

    // Handle other formats (e.g., "Oct 7, 25" -> "Oct 7, 2025")
    let processedDateStr = normalizedDateStr;
    const twoDigitYearMatch = normalizedDateStr.match(/, (\d{2})$/);
    if (twoDigitYearMatch) {
      const twoDigitYear = parseInt(twoDigitYearMatch[1], 10);
      // Assume years 00-50 are 2000-2050, years 51-99 are 1951-1999
      const fourDigitYear =
        twoDigitYear <= 50 ? 2000 + twoDigitYear : 1900 + twoDigitYear;
      processedDateStr = normalizedDateStr.replace(
        /, \d{2}$/,
        `, ${fourDigitYear}`,
      );
    }

    const publishedDate = new Date(processedDateStr);
    if (!isValidDateRange(publishedDate)) {
      return null;
    }
    return publishedDate;
  } catch (error) {
    return null;
  }
}
