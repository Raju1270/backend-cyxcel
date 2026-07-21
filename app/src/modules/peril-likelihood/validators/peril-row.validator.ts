import { Likelihood } from '../utils/likelihood.enum';
import { Impact } from '../utils/impact.enum';
import { parseLikelihood } from '../utils/likelihood-parser.util';
import { parseImpact } from '../utils/impact-parser.util';
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
  warnings: string[];
  peril: Peril | null;
  eu: Likelihood;
  us: Likelihood;
  uk: Likelihood;
  description: string;
  impact?: Impact;
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
 * Parse description and impact for a row - used when the peril doesn't exist
 * yet and needs to be created. Columns are optional; description defaults to
 * an empty string and impact is left undefined when not present/parseable.
 */
function parseDescriptionAndImpact(row: LatestPerilLikelihoodRow): {
  description: string;
  impact?: Impact;
} {
  const descriptionValue = getColumnValue(row, 'Description');
  const description =
    typeof descriptionValue === 'string'
      ? descriptionValue.trim()
      : typeof descriptionValue === 'number'
        ? String(descriptionValue)
        : '';

  const impactValue =
    getColumnValue(row, 'Impact of Peril') ?? getColumnValue(row, 'Impact');
  const impact = parseImpact(impactValue);

  return { description, impact };
}

/**
 * Validate peril row and return validation result.
 * `peril` may be null when the title doesn't match any existing peril yet -
 * that peril will be created on import rather than treated as an error.
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

  // Parse description/impact - only used when the peril needs to be created
  const { description, impact } = parseDescriptionAndImpact(row);

  return {
    warnings,
    peril,
    eu: likelihoodValues.eu,
    us: likelihoodValues.us,
    uk: likelihoodValues.uk,
    description,
    impact,
  };
}
