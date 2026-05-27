import { InvalidItemDto } from '../../../common/dto/import-common.dto';
import { PreviewStatus } from '../../../common/utils/preview-status.enum';
import { getColumnValue } from '../utils/row-parser.util';
import { ServiceRow } from '../types';
import { slugify } from '../../../common/utils/slugify.util';

type RiskCategory = {
  id: string;
  slug: string;
  name: string;
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings: string[];
  riskCategories?: RiskCategory[];
}

/**
 * Validate required fields (riskCategories, title, partnerName, link)
 */
function validateRequiredFields(
  riskCategories: string,
  title: string,
  partnerName: string,
  link: string,
  excelRowNumber: number,
): { isValid: boolean; error?: string } {
  if (!riskCategories || riskCategories.trim() === '') {
    return {
      isValid: false,
      error: `Risk Categories is required for row ${excelRowNumber}`,
    };
  }

  if (!title || title.trim() === '') {
    return {
      isValid: false,
      error: `Title is required for row ${excelRowNumber}`,
    };
  }

  if (!partnerName || partnerName.trim() === '') {
    return {
      isValid: false,
      error: `PartnerName is required for row ${excelRowNumber}`,
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
 * Validate and find risk categories
 * Supports comma-separated risk categories
 * First checks if values are already slugs, otherwise converts to slugs
 */
function validateRiskCategories(
  riskCategoriesStr: string,
  riskCategoryMap: Map<string, RiskCategory>,
  excelRowNumber: number,
): { isValid: boolean; error?: string; riskCategories?: RiskCategory[] } {
  // Split by comma and trim each category
  const categoryNames = riskCategoriesStr
    .split(',')
    .map((cat) => cat.trim())
    .filter((cat) => cat.length > 0);

  if (categoryNames.length === 0) {
    return {
      isValid: false,
      error: `At least one Risk Category is required for row ${excelRowNumber}`,
    };
  }

  const foundCategories: RiskCategory[] = [];
  const invalidCategories: string[] = [];

  for (const categoryName of categoryNames) {
    // First check if it's already a slug (for CSV files that use slugs directly)
    let slug = categoryName;
    let riskCategory = riskCategoryMap.get(slug);

    // If not found as slug, try converting to slug
    if (!riskCategory) {
      slug = slugify(categoryName);
      riskCategory = riskCategoryMap.get(slug);
    }

    if (!riskCategory) {
      invalidCategories.push(categoryName);
    } else {
      foundCategories.push(riskCategory);
    }
  }

  if (invalidCategories.length > 0) {
    return {
      isValid: false,
      error: `Invalid Risk Categories '${invalidCategories.join(', ')}' for row ${excelRowNumber}. Valid slugs: ${Array.from(riskCategoryMap.keys()).join(', ')}`,
    };
  }

  return { isValid: true, riskCategories: foundCategories };
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
 * Validate service row and return validation result
 */
export function validateServiceRow(
  row: ServiceRow,
  riskCategoryMap: Map<string, RiskCategory>,
  excelRowNumber: number,
): ValidationResult {
  const warnings: string[] = [];

  // Parse row values using case-insensitive column lookup
  const riskCategoriesValue = getColumnValue(row, 'Risk Categories');
  const titleValue = getColumnValue(row, 'Title');
  const partnerNameValue = getColumnValue(row, 'PartnerName');
  const descriptionValue = getColumnValue(row, 'description');
  const linkValue = getColumnValue(row, 'link');

  const riskCategories = riskCategoriesValue
    ? String(riskCategoriesValue).trim()
    : '';
  const title = titleValue ? String(titleValue).trim() : '';
  const partnerName = partnerNameValue ? String(partnerNameValue).trim() : '';
  const description = descriptionValue ? String(descriptionValue).trim() : '';
  const link = linkValue ? String(linkValue).trim() : '';

  // Validate required fields
  const requiredFieldsResult = validateRequiredFields(
    riskCategories,
    title,
    partnerName,
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

  // Validate risk categories
  const riskCategoriesResult = validateRiskCategories(
    riskCategories,
    riskCategoryMap,
    excelRowNumber,
  );
  if (!riskCategoriesResult.isValid) {
    return {
      isValid: false,
      error: riskCategoriesResult.error,
      warnings: [],
    };
  }

  // Validate URL format (only warn, don't fail)
  if (link && !validateUrl(link, excelRowNumber)) {
    warnings.push(`Invalid URL format '${link}' at row ${excelRowNumber}`);
  }

  // Warn if description is empty
  if (!description || description.trim() === '') {
    warnings.push(`Description is empty at row ${excelRowNumber}`);
  }

  return {
    isValid: true,
    warnings,
    riskCategories: riskCategoriesResult.riskCategories,
  };
}

/**
 * Create invalid item DTO
 */
export function createInvalidItemDto(
  row: ServiceRow,
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
