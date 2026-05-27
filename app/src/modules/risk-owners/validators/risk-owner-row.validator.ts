import { BadRequestException } from '@nestjs/common';
import { RiskOwnerRow } from '../types';
import { parseRiskOwnerRow, parseOwnersList } from '../utils/row-parser.util';

export interface RiskOwnerValidationResult {
  isValid: boolean;
  error?: string;
  warnings: string[];
  natureOfLoss?: string;
  primaryOwners?: string[];
  secondaryOwners?: string[];
}

/**
 * Validate risk owner row
 */
export function validateRiskOwnerRow(
  row: RiskOwnerRow,
  excelRowNumber: number,
): RiskOwnerValidationResult {
  const warnings: string[] = [];
  const parsedRow = parseRiskOwnerRow(row);

  // Validate Nature of Loss
  if (!parsedRow.natureOfLoss || parsedRow.natureOfLoss.trim() === '') {
    return {
      isValid: false,
      error: `Row ${excelRowNumber}: Nature of Loss is required`,
      warnings: [],
    };
  }

  // Parse owners lists
  const primaryOwners = parseOwnersList(parsedRow.primary);
  const secondaryOwners = parseOwnersList(parsedRow.secondary);

  // Validate that at least one primary owner exists
  if (primaryOwners.length === 0) {
    return {
      isValid: false,
      error: `Row ${excelRowNumber}: At least one Primary owner is required`,
      warnings: [],
    };
  }

  return {
    isValid: true,
    warnings,
    natureOfLoss: parsedRow.natureOfLoss,
    primaryOwners,
    secondaryOwners,
  };
}

/**
 * Create invalid item DTO for preview response
 */
export function createInvalidItemDto(
  row: RiskOwnerRow,
  excelRowNumber: number,
  sheetName: string,
  error: string,
) {
  return {
    row: excelRowNumber,
    sheetName: sheetName,
    error: error,
    rowData: row,
  };
}
