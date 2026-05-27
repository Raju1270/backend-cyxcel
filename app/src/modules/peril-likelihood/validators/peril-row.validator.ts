import { InvalidItemDto } from '../../../common/dto/import-common.dto';
import { PreviewStatus } from '../../../common/utils/preview-status.enum';
import { Likelihood } from '../utils/likelihood.enum';
import { parseLikelihood } from '../utils/likelihood-parser.util';
import { getColumnValue, columnExists } from '../utils/row-parser.util';

type LatestPerilLikelihoodRow = {
  Title: string;
  [key: `EU ${string}`]: string | number | undefined;
  [key: `US ${string}`]: string | number | undefined;
  [key: `UK ${string}`]: string | number | undefined;
};

type Peril = {
  id: string;
  name: string;
  slug: string;
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings: string[];
  peril?: Peril;
  eu?: Likelihood;
  us?: Likelihood;
  uk?: Likelihood;
}

/**
 * Validate that peril exists
 */
function validatePerilExists(
  peril: Peril | null,
  title: string,
  slug: string,
): { isValid: boolean; error?: string; peril?: Peril } {
  if (!peril) {
    return {
      isValid: false,
      error: `Peril not found for title='${title}' (slug='${slug}')`,
    };
  }

  return { isValid: true, peril };
}

/**
 * Check for missing columns and add warnings
 */
function checkMissingColumns(
  row: LatestPerilLikelihoodRow,
  euColumn: string,
  usColumn: string,
  ukColumn: string,
  sheetName: string,
  excelRowNumber: number,
): string[] {
  const warnings: string[] = [];

  if (!columnExists(row, euColumn)) {
    warnings.push(
      `Column '${euColumn}' not found at sheet '${sheetName}', row ${excelRowNumber}`,
    );
  }
  if (!columnExists(row, usColumn)) {
    warnings.push(
      `Column '${usColumn}' not found at sheet '${sheetName}', row ${excelRowNumber}`,
    );
  }
  if (!columnExists(row, ukColumn)) {
    warnings.push(
      `Column '${ukColumn}' not found at sheet '${sheetName}', row ${excelRowNumber}`,
    );
  }

  return warnings;
}

/**
 * Parse likelihood values from row
 */
function parseLikelihoodValues(
  row: LatestPerilLikelihoodRow,
  euColumn: string,
  usColumn: string,
  ukColumn: string,
): {
  eu: Likelihood;
  us: Likelihood;
  uk: Likelihood;
} {
  const euValue =
    parseLikelihood(getColumnValue(row, euColumn)) ??
    Likelihood.HIGHLY_UNLIKELY;
  const usValue =
    parseLikelihood(getColumnValue(row, usColumn)) ??
    Likelihood.HIGHLY_UNLIKELY;
  const ukValue =
    parseLikelihood(getColumnValue(row, ukColumn)) ??
    Likelihood.HIGHLY_UNLIKELY;

  return {
    eu: euValue,
    us: usValue,
    uk: ukValue,
  };
}

/**
 * Validate peril row and return validation result
 */
export function validatePerilRow(
  row: LatestPerilLikelihoodRow,
  peril: Peril | null,
  euColumn: string,
  usColumn: string,
  ukColumn: string,
  sheetName: string,
  excelRowNumber: number,
): ValidationResult {
  const warnings: string[] = [];

  const title = row.Title ? String(row.Title).trim() : '';
  if (!peril) {
    return {
      isValid: false,
      error: `Peril not found for title='${title}'`,
      warnings: [],
    };
  }

  // Check for missing columns
  const missingColumnWarnings = checkMissingColumns(
    row,
    euColumn,
    usColumn,
    ukColumn,
    sheetName,
    excelRowNumber,
  );
  warnings.push(...missingColumnWarnings);

  // Parse likelihood values
  const likelihoodValues = parseLikelihoodValues(
    row,
    euColumn,
    usColumn,
    ukColumn,
  );

  return {
    isValid: true,
    warnings,
    peril,
    eu: likelihoodValues.eu,
    us: likelihoodValues.us,
    uk: likelihoodValues.uk,
  };
}

/**
 * Create invalid item DTO
 */
export function createInvalidItemDto(
  row: LatestPerilLikelihoodRow,
  excelRowNumber: number,
  sheetName: string,
  error: string,
): InvalidItemDto {
  return {
    rowData: row,
    _data: {
      row: excelRowNumber,
      sheetName: sheetName,
      error,
    },
  };
}
