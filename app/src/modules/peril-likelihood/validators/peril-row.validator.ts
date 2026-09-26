import { Likelihood } from '../utils/likelihood.enum';
import { Impact } from '../utils/impact.enum';
import { parseLikelihood } from '../utils/likelihood-parser.util';
import { parseImpact } from '../utils/impact-parser.util';
import {
  anyColumnExists,
  getColumnValue,
  getFirstColumnValue,
  getRegionColumnCandidates,
} from '../utils/row-parser.util';

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
  const euCandidates = getRegionColumnCandidates(row, 'EU', euColumn);
  const usCandidates = getRegionColumnCandidates(row, 'US', usColumn);
  const ukCandidates = getRegionColumnCandidates(row, 'UK', ukColumn);

  if (!anyColumnExists(row, euCandidates)) {
    warnings.push(
      `Column '${euColumn}' not found at sheet '${sheetName}', row ${excelRowNumber}`,
    );
  }
  if (!anyColumnExists(row, usCandidates)) {
    warnings.push(
      `Column '${usColumn}' not found at sheet '${sheetName}', row ${excelRowNumber}`,
    );
  }
  if (!anyColumnExists(row, ukCandidates)) {
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
  const euCandidates = getRegionColumnCandidates(row, 'EU', euColumn);
  const usCandidates = getRegionColumnCandidates(row, 'US', usColumn);
  const ukCandidates = getRegionColumnCandidates(row, 'UK', ukColumn);

  const euValue =
    parseLikelihood(getFirstColumnValue(row, euCandidates)) ??
    Likelihood.HIGHLY_UNLIKELY;
  const usValue =
    parseLikelihood(getFirstColumnValue(row, usCandidates)) ??
    Likelihood.HIGHLY_UNLIKELY;
  const ukValue =
    parseLikelihood(getFirstColumnValue(row, ukCandidates)) ??
    Likelihood.HIGHLY_UNLIKELY;

  return {
    eu: euValue,
    us: usValue,
    uk: ukValue,
  };
}

/**
 * Parse the optional "Description" column. An empty string means the cell was
 * blank / missing - callers treat that as "not provided", never as "clear it".
 */
function parseDescriptionValue(row: LatestPerilLikelihoodRow): string {
  const value = getColumnValue(row, 'Description');
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return '';
}

/**
 * Parse the optional "Impact of Peril" / "Impact" column. Left undefined when
 * blank or unparseable so a blank cell never overwrites the saved impact.
 */
function parseImpactValue(row: LatestPerilLikelihoodRow): Impact | undefined {
  const impactValue =
    getColumnValue(row, 'Impact of Peril') ?? getColumnValue(row, 'Impact');
  return parseImpact(impactValue);
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

  return {
    warnings,
    peril,
    eu: likelihoodValues.eu,
    us: likelihoodValues.us,
    uk: likelihoodValues.uk,
    description: parseDescriptionValue(row),
    impact: parseImpactValue(row),
  };
}
