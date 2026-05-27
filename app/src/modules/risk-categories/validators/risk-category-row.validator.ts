import { InvalidItemDto } from '../../../common/dto/import-common.dto';
import { PreviewStatus } from '../../../common/utils/preview-status.enum';
import { getColumnValue } from '../utils/row-parser.util';
import { RiskCategoryRow } from '../types';
import { getLossDataForCategory } from '../utils/loss-data-mapping.util';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings: string[];
  lossData?: any;
}

/**
 * Validate required fields (title)
 */
function validateRequiredFields(
  title: string,
  excelRowNumber: number,
): { isValid: boolean; error?: string } {
  if (!title || title.trim() === '') {
    return {
      isValid: false,
      error: `Title is required for row ${excelRowNumber}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate and get loss data for category
 */
function validateLossData(
  title: string,
  excelRowNumber: number,
): { isValid: boolean; error?: string; lossData?: any } {
  const lossData = getLossDataForCategory(title);

  if (!lossData) {
    return {
      isValid: false,
      error: `No loss data mapping found for category '${title}' at row ${excelRowNumber}. Supported categories: Cyber, Supply Chain, Regulation, Technology (IT/OT), Corporate Responsibility, Geopolitics, AI Governance`,
    };
  }

  return { isValid: true, lossData };
}

/**
 * Validate risk category row and return validation result
 */
export function validateRiskCategoryRow(
  row: RiskCategoryRow,
  excelRowNumber: number,
): ValidationResult {
  const warnings: string[] = [];

  // Parse row values using case-insensitive column lookup
  const titleValue = getColumnValue(row, 'Title');
  const title = titleValue ? String(titleValue).trim() : '';

  // Validate required fields
  const requiredFieldsResult = validateRequiredFields(title, excelRowNumber);
  if (!requiredFieldsResult.isValid) {
    return {
      isValid: false,
      error: requiredFieldsResult.error,
      warnings: [],
    };
  }

  // Validate loss data mapping
  const lossDataResult = validateLossData(title, excelRowNumber);
  if (!lossDataResult.isValid) {
    return {
      isValid: false,
      error: lossDataResult.error,
      warnings: [],
    };
  }

  return {
    isValid: true,
    warnings,
    lossData: lossDataResult.lossData,
  };
}

/**
 * Create invalid item DTO
 */
export function createInvalidItemDto(
  row: RiskCategoryRow,
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
