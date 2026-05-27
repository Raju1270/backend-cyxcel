import * as XLSX from 'xlsx';

export interface ParsedVerticalData {
  vertical: string;
  source: string;
  chartTitle: string;
  data: any[];
}

export interface ParsedTier1LossData {
  verticals: ParsedVerticalData[];
}

interface VerticalBoundaries {
  name: string;
  startColumn: number;
  endColumn: number;
}

/**
 * Find the row containing "For which vertical" text
 */
function findVerticalHeaderRow(rows: any[][]): number {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;

    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = String(row[colIndex] || '')
        .trim()
        .toLowerCase();
      if (cellValue.includes('for which vertical')) {
        return rowIndex;
      }
    }
  }
  return -1;
}

/**
 * Check if a cell value matches a known vertical name pattern
 * Returns the matched pattern name, or the original value if no pattern matches (for new categories)
 */
function matchesVerticalPattern(cellValue: string): string | null {
  const normalized = String(cellValue || '')
    .trim()
    .toLowerCase();
  const trimmed = String(cellValue || '').trim();

  // Skip empty values and header text
  if (!trimmed || normalized.includes('for which vertical')) {
    return null;
  }

  if (normalized.includes('cyber')) {
    return 'Cyber Vertical';
  }
  if (
    normalized.includes('supply chain') ||
    normalized.includes('supply-chain')
  ) {
    return 'Supply chain vertical';
  }
  if (
    normalized.includes('tech') &&
    (normalized.includes('it/ot') || normalized.includes('it ot'))
  ) {
    return 'Tech (IT/OT vertical)';
  }
  if (
    normalized.includes('corporate') &&
    normalized.includes('responsibility')
  ) {
    return 'Corporate Responsibility vertical';
  }
  if (
    normalized.includes('geopolitics') ||
    normalized.includes('geo-politics')
  ) {
    return 'Geopolitics';
  }
  if (normalized.includes('ai') && !normalized.includes('governance')) {
    return 'AI';
  }

  // Fallback: return the original value for new/unknown categories
  return trimmed;
}

/**
 * Dynamically determine vertical boundaries by scanning the header row
 * Finds vertical names in the row and determines their column ranges
 */
function getVerticalBoundaries(
  rows: any[][],
  headerRowIndex: number,
): VerticalBoundaries[] {
  const boundaries: VerticalBoundaries[] = [];
  const headerRow = rows[headerRowIndex];

  if (!headerRow || headerRow.length === 0) {
    return boundaries;
  }

  // Find all verticals in the header row
  const foundVerticals: Array<{ name: string; startColumn: number }> = [];

  for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
    const cellValue = String(headerRow[colIndex] || '').trim();
    if (!cellValue) continue;

    const verticalName = matchesVerticalPattern(cellValue);
    if (verticalName) {
      foundVerticals.push({
        name: verticalName,
        startColumn: colIndex,
      });
    }
  }

  // Determine end column for each vertical (start of next vertical or end of row)
  for (let i = 0; i < foundVerticals.length; i++) {
    const current = foundVerticals[i];
    let endColumn: number;

    if (i < foundVerticals.length - 1) {
      // End column is one before the next vertical starts
      endColumn = foundVerticals[i + 1].startColumn - 1;
    } else {
      // Last vertical: find the end by checking data rows (starting from row 4, index 3)
      // Check up to 40 rows of data to determine the maximum column with data
      let maxCol = current.startColumn;
      const dataStartRow = headerRowIndex + 3; // Row 4 is 3 rows after header

      for (
        let rowIndex = dataStartRow;
        rowIndex < Math.min(dataStartRow + 40, rows.length);
        rowIndex++
      ) {
        const row = rows[rowIndex];
        if (!row) continue;

        // Find the last non-empty cell in this row starting from current vertical's start column
        for (
          let colIndex = current.startColumn;
          colIndex < row.length;
          colIndex++
        ) {
          const cellValue = row[colIndex];
          if (
            cellValue !== null &&
            cellValue !== undefined &&
            String(cellValue).trim() !== ''
          ) {
            maxCol = Math.max(maxCol, colIndex);
          }
        }
      }

      // Also check metadata rows (Source and Title rows) for the last vertical
      for (
        let rowIndex = headerRowIndex + 1;
        rowIndex < dataStartRow;
        rowIndex++
      ) {
        const row = rows[rowIndex];
        if (!row) continue;

        for (
          let colIndex = current.startColumn;
          colIndex < row.length;
          colIndex++
        ) {
          const cellValue = row[colIndex];
          if (
            cellValue !== null &&
            cellValue !== undefined &&
            String(cellValue).trim() !== ''
          ) {
            maxCol = Math.max(maxCol, colIndex);
          }
        }
      }

      endColumn = maxCol;
    }

    boundaries.push({
      name: current.name,
      startColumn: current.startColumn,
      endColumn: endColumn,
    });
  }

  return boundaries;
}

/**
 * Extract text from a row range, combining cells into a single string
 */
function extractTextFromRowRange(
  rows: any[][],
  rowIndex: number,
  startCol: number,
  endCol: number,
): string {
  if (rowIndex < 0 || rowIndex >= rows.length) return '';

  const row = rows[rowIndex];
  if (!row) return '';

  const parts: string[] = [];
  for (let col = startCol; col <= endCol && col < row.length; col++) {
    const cellValue = String(row[col] || '').trim();
    if (cellValue) {
      parts.push(cellValue);
    }
  }
  return parts.join(' ').trim();
}

/**
 * Parse Source of the data from row 2 for a given vertical range
 */
function parseSource(rows: any[][], startCol: number, endCol: number): string {
  return extractTextFromRowRange(rows, 1, startCol, endCol); // Row 2 is index 1 (0-based)
}

/**
 * Parse Title of the chart from row 3 for a given vertical range
 */
function parseChartTitle(
  rows: any[][],
  startCol: number,
  endCol: number,
): string {
  return extractTextFromRowRange(rows, 2, startCol, endCol); // Row 3 is index 2 (0-based)
}

/**
 * Parse Cyber Vertical data
 */
function parseCyberData(
  rows: any[][],
  startCol: number,
  endCol: number,
): any[] {
  const data: any[] = [];
  const dataStartRow = 3; // Row 4 is index 3 (0-based)
  const maxRows = 40;

  for (
    let rowIndex = dataStartRow;
    rowIndex < dataStartRow + maxRows && rowIndex < rows.length;
    rowIndex++
  ) {
    const row = rows[rowIndex];
    if (!row) break;

    const dataType = String(row[startCol] || '').trim();
    if (!dataType) continue; // Skip empty rows

    const smes = parseNumber(row[startCol + 1]);
    const largeCompanies = parseNumber(row[startCol + 2]);

    if (dataType && (smes !== null || largeCompanies !== null)) {
      data.push({
        dataType,
        SMEs: smes,
        largeCompanies: largeCompanies,
      });
    }
  }

  return data;
}

/**
 * Parse Supply Chain Vertical data
 */
function parseSupplyChainData(
  rows: any[][],
  startCol: number,
  endCol: number,
): any[] {
  const data: any[] = [];
  const dataStartRow = 3; // Row 4 is index 3 (0-based)
  const maxRows = 40;

  for (
    let rowIndex = dataStartRow;
    rowIndex < dataStartRow + maxRows && rowIndex < rows.length;
    rowIndex++
  ) {
    const row = rows[rowIndex];
    if (!row) break;

    const yearValue = row[startCol];
    const year = parseYear(yearValue);
    if (!year) continue; // Skip rows without valid year

    const total = parseNumber(row[startCol + 1]);

    if (year && total !== null) {
      data.push({
        year,
        total,
      });
    }
  }

  return data;
}

/**
 * Parse Tech (IT/OT) Vertical data
 */
function parseTechData(rows: any[][], startCol: number, endCol: number): any[] {
  const data: any[] = [];
  const dataStartRow = 3; // Row 4 is index 3 (0-based)
  const maxRows = 40;

  for (
    let rowIndex = dataStartRow;
    rowIndex < dataStartRow + maxRows && rowIndex < rows.length;
    rowIndex++
  ) {
    const row = rows[rowIndex];
    if (!row) break;

    const outageCause = String(row[startCol] || '').trim();
    if (!outageCause) continue; // Skip empty rows

    const percent = parsePercent(row[startCol + 1]);

    if (outageCause && percent !== null) {
      data.push({
        outageCause,
        percent,
      });
    }
  }

  return data;
}

/**
 * Parse Corporate Responsibility Vertical data
 */
function parseCorporateResponsibilityData(
  rows: any[][],
  startCol: number,
  endCol: number,
): any[] {
  const data: any[] = [];
  const dataStartRow = 3; // Row 4 is index 3 (0-based)
  const maxRows = 40;

  for (
    let rowIndex = dataStartRow;
    rowIndex < dataStartRow + maxRows && rowIndex < rows.length;
    rowIndex++
  ) {
    const row = rows[rowIndex];
    if (!row) break;

    const subjectArea = String(row[startCol] || '').trim();
    if (!subjectArea) continue; // Skip empty rows

    const strengthOfRegulation = parsePercent(row[startCol + 1]);
    const strengthOfImplementation = parsePercent(row[startCol + 2]);

    if (
      subjectArea &&
      (strengthOfRegulation !== null || strengthOfImplementation !== null)
    ) {
      data.push({
        subjectArea,
        strengthOfRegulation: strengthOfRegulation,
        strengthOfImplementation: strengthOfImplementation,
      });
    }
  }

  return data;
}

/**
 * Parse Geopolitics data
 */
function parseGeopoliticsData(
  rows: any[][],
  startCol: number,
  endCol: number,
): any[] {
  const data: any[] = [];
  const dataStartRow = 3; // Row 4 is index 3 (0-based)
  const maxRows = 40;

  for (
    let rowIndex = dataStartRow;
    rowIndex < dataStartRow + maxRows && rowIndex < rows.length;
    rowIndex++
  ) {
    const row = rows[rowIndex];
    if (!row) break;

    const event = String(row[startCol] || '').trim();
    if (!event) continue; // Skip empty rows

    const materialPositive = parseNumber(row[startCol + 1]) || 0;
    const positive = parseNumber(row[startCol + 2]) || 0;
    const negative = parseNumber(row[startCol + 3]) || 0;
    const materialNegative = parseNumber(row[startCol + 4]) || 0;

    if (event) {
      data.push({
        event,
        materialPositiveFinancialImpact: materialPositive,
        positiveFinancialImpact: positive,
        negativeFinancialImpact: negative,
        materialNegativeFinancialImpact: materialNegative,
      });
    }
  }

  return data;
}

/**
 * Parse AI data
 */
function parseAIData(rows: any[][], startCol: number, endCol: number): any[] {
  const data: any[] = [];
  const dataStartRow = 3; // Row 4 is index 3 (0-based)
  const maxRows = 40;

  for (
    let rowIndex = dataStartRow;
    rowIndex < dataStartRow + maxRows && rowIndex < rows.length;
    rowIndex++
  ) {
    const row = rows[rowIndex];
    if (!row) break;

    const country = String(row[startCol] || '').trim();
    if (!country) continue; // Skip empty rows

    const talentRanking = parseNumber(row[startCol + 1]);
    const infrastructureRanking = parseNumber(row[startCol + 2]);
    const operatingEnvironmentRanking = parseNumber(row[startCol + 3]);
    const governmentStrategyRanking = parseNumber(row[startCol + 4]);

    if (country) {
      data.push({
        country,
        talentRanking: talentRanking,
        infrastructureRanking: infrastructureRanking,
        operatingEnvironmentRanking: operatingEnvironmentRanking,
        governmentStrategyRanking: governmentStrategyRanking,
      });
    }
  }

  return data;
}

/**
 * Universal parser for unknown/new vertical types
 * Attempts to automatically detect data structure and parse accordingly
 */
function parseGenericData(
  rows: any[][],
  startCol: number,
  endCol: number,
): any[] {
  const data: any[] = [];
  const dataStartRow = 3; // Row 4 is index 3 (0-based)
  const maxRows = 40;

  for (
    let rowIndex = dataStartRow;
    rowIndex < dataStartRow + maxRows && rowIndex < rows.length;
    rowIndex++
  ) {
    const row = rows[rowIndex];
    if (!row) break;

    // Try to detect structure by checking first few columns
    const firstCol = row[startCol];
    const secondCol = row[startCol + 1];

    if (firstCol === null || firstCol === undefined) continue; // Skip empty rows

    const firstColStr = String(firstCol || '').trim();
    if (!firstColStr) continue;

    // Try to parse as year-total format (like Supply Chain)
    const year = parseYear(firstCol);
    if (year && secondCol !== null && secondCol !== undefined) {
      const total = parseNumber(secondCol);
      if (total !== null) {
        data.push({
          year,
          total,
        });
        continue;
      }
    }

    // Try to parse as key-value format (like Tech)
    const percent = parsePercent(secondCol);
    if (percent !== null) {
      data.push({
        name: firstColStr,
        value: percent,
      });
      continue;
    }

    // Try to parse as key-number format
    const numberValue = parseNumber(secondCol);
    if (numberValue !== null) {
      data.push({
        name: firstColStr,
        value: numberValue,
      });
      continue;
    }

    // Fallback: collect all non-empty columns as an object
    const rowData: any = {};
    let hasData = false;
    for (
      let colIndex = startCol;
      colIndex <= endCol && colIndex < row.length;
      colIndex++
    ) {
      const cellValue = row[colIndex];
      if (
        cellValue !== null &&
        cellValue !== undefined &&
        String(cellValue).trim() !== ''
      ) {
        rowData[`col${colIndex - startCol}`] = cellValue;
        hasData = true;
      }
    }

    if (hasData) {
      data.push(rowData);
    }
  }

  return data;
}

/**
 * Parse data for a specific vertical based on its name
 */
function parseVerticalData(
  verticalName: string,
  rows: any[][],
  startCol: number,
  endCol: number,
): any[] {
  const normalizedName = verticalName.toLowerCase();

  if (normalizedName.includes('cyber')) {
    return parseCyberData(rows, startCol, endCol);
  } else if (normalizedName.includes('supply chain')) {
    return parseSupplyChainData(rows, startCol, endCol);
  } else if (
    normalizedName.includes('tech') ||
    normalizedName.includes('it/ot')
  ) {
    return parseTechData(rows, startCol, endCol);
  } else if (
    normalizedName.includes('corporate') ||
    normalizedName.includes('responsibility')
  ) {
    return parseCorporateResponsibilityData(rows, startCol, endCol);
  } else if (normalizedName.includes('geopolitics')) {
    return parseGeopoliticsData(rows, startCol, endCol);
  } else if (normalizedName.includes('ai')) {
    return parseAIData(rows, startCol, endCol);
  }

  // Fallback: use generic parser for unknown verticals
  return parseGenericData(rows, startCol, endCol);
}

/**
 * Parse Tier 1 Loss Data Sheet with multi-vertical structure
 * Each vertical has metadata (For which vertical, Source of the data, Title of the chart)
 * followed by a data table with different column structures
 */
export function parseTier1LossDataSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
): ParsedTier1LossData {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet '${sheetName}' not found`);
  }

  // Get all cells as array of arrays (row-based)
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const rows: any[][] = [];

  for (let R = range.s.r; R <= range.e.r; R++) {
    const row: any[] = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      row.push(cell ? cell.v : null);
    }
    rows.push(row);
  }

  // Step 1: Find the row containing "For which vertical"
  const headerRowIndex = findVerticalHeaderRow(rows);
  if (headerRowIndex === -1) {
    return { verticals: [] };
  }

  // Step 2: Dynamically determine vertical boundaries from the file
  const verticalBoundaries = getVerticalBoundaries(rows, headerRowIndex);
  const verticals: ParsedVerticalData[] = [];

  // Step 3: Parse each vertical
  for (const boundary of verticalBoundaries) {
    // Use the normalized vertical name from boundary (already processed by matchesVerticalPattern)
    // This ensures consistent naming regardless of Excel cell capitalization
    const verticalName = boundary.name;
    if (!verticalName) continue;

    // Parse metadata from row 2 (index 1) and row 3 (index 2)
    const source = parseSource(rows, boundary.startColumn, boundary.endColumn);
    const chartTitle = parseChartTitle(
      rows,
      boundary.startColumn,
      boundary.endColumn,
    );

    // Parse data starting from row 4 (index 3)
    const data = parseVerticalData(
      verticalName,
      rows,
      boundary.startColumn,
      boundary.endColumn,
    );

    if (data.length > 0) {
      verticals.push({
        vertical: verticalName,
        source,
        chartTitle,
        data,
      });
    }
  }

  return { verticals };
}

/**
 * Parse number value, handling various formats
 */
function parseNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;

  const str = String(value).trim();
  if (!str) return null;

  // Remove currency symbols, commas, and other formatting
  const cleaned = str
    .replace(/[£$€,]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\d.-]/g, '');

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse year value
 */
function parseYear(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    // Excel dates are serial numbers, convert if reasonable
    if (value > 1900 && value < 2100) return Math.round(value);
    // Otherwise might be Excel date serial
    return null;
  }

  const str = String(value).trim();
  if (!str) return null;

  const num = parseInt(str, 10);
  if (num >= 1900 && num <= 2100) return num;

  return null;
}

/**
 * Parse percentage value, converting to number
 */
function parsePercent(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;

  const str = String(value).trim();
  if (!str) return null;

  // Remove % symbol
  const cleaned = str.replace(/%/g, '').trim();

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
