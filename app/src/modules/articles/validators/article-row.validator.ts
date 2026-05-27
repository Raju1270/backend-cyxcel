import { InvalidItemDto } from '../../../common/dto/import-common.dto';
import { PreviewStatus } from '../../../common/utils/preview-status.enum';
import { parseArticleDate } from './date.validator';
import { getRiskCategorySlug } from '../utils/risk-vertical-mapping.util';
import { getColumnValue } from '../utils/row-parser.util';
import { ArticleRow } from '../types';

type RiskCategory = {
  id: string;
  slug: string;
  name: string;
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings: string[];
  publishedDate?: Date;
  riskCategory?: RiskCategory;
}

/**
 * Validate required fields (riskVertical, date, link)
 */
function validateRequiredFields(
  riskVertical: string,
  dateStr: string,
  link: string,
  excelRowNumber: number,
): { isValid: boolean; error?: string } {
  if (!riskVertical || riskVertical.trim() === '') {
    return {
      isValid: false,
      error: `Risk Vertical is required for row ${excelRowNumber}`,
    };
  }

  if (!dateStr || dateStr.trim() === '') {
    return {
      isValid: false,
      error: `Date is required for row ${excelRowNumber}`,
    };
  }

  if (!link || link.trim() === '') {
    return {
      isValid: false,
      error: `Link is required for row ${excelRowNumber}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate and find risk category
 * Supports both CSV format (direct slug values) and Excel format (mapped values)
 */
function validateRiskCategory(
  riskVertical: string,
  riskCategoryMap: Map<string, RiskCategory>,
  excelRowNumber: number,
): { isValid: boolean; error?: string; riskCategory?: RiskCategory } {
  // First, check if the value is already a slug (for CSV files)
  let riskCategorySlug: string | null = null;
  const normalized = riskVertical.trim();

  // Check if it's already a valid slug in the map
  if (riskCategoryMap.has(normalized)) {
    riskCategorySlug = normalized;
  } else {
    // If not found as slug, try mapping from Excel format
    riskCategorySlug = getRiskCategorySlug(riskVertical);
  }

  if (!riskCategorySlug) {
    return {
      isValid: false,
      error: `Invalid Risk Vertical '${riskVertical}' for row ${excelRowNumber}`,
    };
  }

  const riskCategory = riskCategoryMap.get(riskCategorySlug);
  if (!riskCategory) {
    return {
      isValid: false,
      error: `RiskCategory with slug '${riskCategorySlug}' not found for Risk Vertical '${riskVertical}' at row ${excelRowNumber}`,
    };
  }

  return { isValid: true, riskCategory };
}

/**
 * Validate URL format
 */
function validateUrl(link: string, excelRowNumber: number): boolean {
  try {
    new URL(link);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate article row and return validation result
 */
export function validateArticleRow(
  row: ArticleRow,
  riskCategoryMap: Map<string, RiskCategory>,
  excelRowNumber: number,
): ValidationResult {
  const warnings: string[] = [];

  // Parse row values using case-insensitive column lookup
  const riskVerticalValue = getColumnValue(row, 'Risk Vertical');
  const dateStrValue = getColumnValue(row, 'Date');
  const linkValue = getColumnValue(row, 'Link');

  const riskVertical = riskVerticalValue
    ? String(riskVerticalValue).trim()
    : '';
  const dateStr = dateStrValue ? String(dateStrValue).trim() : '';
  const link = linkValue ? String(linkValue).trim() : '';

  // Validate required fields
  const requiredFieldsResult = validateRequiredFields(
    riskVertical,
    dateStr,
    link,
    excelRowNumber,
  );
  if (!requiredFieldsResult.isValid) {
    return {
      isValid: false,
      error: requiredFieldsResult.error,
      warnings: [],
    };
  }

  // Validate risk category
  const riskCategoryResult = validateRiskCategory(
    riskVertical,
    riskCategoryMap,
    excelRowNumber,
  );
  if (!riskCategoryResult.isValid) {
    return {
      isValid: false,
      error: riskCategoryResult.error,
      warnings: [],
    };
  }

  // Parse date
  const publishedDate = parseArticleDate(dateStr);
  if (!publishedDate) {
    warnings.push(`Invalid date format '${dateStr}' at row ${excelRowNumber}`);
  }

  // Validate URL format
  if (!validateUrl(link, excelRowNumber)) {
    warnings.push(`Invalid URL format '${link}' at row ${excelRowNumber}`);
  }

  return {
    isValid: true,
    warnings,
    publishedDate: publishedDate || new Date(), // Fallback to current date for preview
    riskCategory: riskCategoryResult.riskCategory,
  };
}

/**
 * Create invalid item DTO
 */
export function createInvalidItemDto(
  row: ArticleRow,
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
