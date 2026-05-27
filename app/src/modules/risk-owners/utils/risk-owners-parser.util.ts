import { PreviewStatus } from '../../../common/utils/preview-status.enum';
import { generateCreatedAt } from '../../../common/utils/date.util';
import { RiskOwnerRow } from '../types';
import { RiskOwnerPreviewItem } from '../dto/preview-response.dto';
import {
  validateRiskOwnerRow,
  createInvalidItemDto,
} from '../validators/risk-owner-row.validator';
import { isEmptyOrHeaderRow, parseRiskOwnerRow } from './row-parser.util';

export interface ParsedRiskOwnersData {
  previewItems: RiskOwnerPreviewItem[];
  invalidItemsDetails: any[];
  invalidItemsCount: number;
  uniquePrimaryOwners: Set<string>;
}

export interface RiskOwnersParseOptions {
  rows: RiskOwnerRow[];
  sheetName: string;
  existingRiskOwnerNames: Set<string>;
  month?: string;
  year?: string;
}

/**
 * Parse rows and collect unique primaryOwners
 */
export function parseRiskOwnersData(
  options: RiskOwnersParseOptions,
): ParsedRiskOwnersData {
  const { rows, sheetName, existingRiskOwnerNames, month, year } = options;

  const previewItems: RiskOwnerPreviewItem[] = [];
  const invalidItemsDetails = [];
  let invalidItems = 0;
  const uniquePrimaryOwners = new Set<string>();

  // Process each row to validate and collect primaryOwners
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const excelRowNumber = rowIndex + 2; // +2 because Excel rows start at 1 and we skip header

    const parsedRow = parseRiskOwnerRow(row);

    // Skip empty rows and header rows
    if (isEmptyOrHeaderRow(parsedRow.natureOfLoss)) {
      continue;
    }

    // Validate row
    const validationResult = validateRiskOwnerRow(row, excelRowNumber);

    // Handle invalid rows
    if (!validationResult.isValid) {
      invalidItems++;
      invalidItemsDetails.push(
        createInvalidItemDto(
          row,
          excelRowNumber,
          sheetName,
          validationResult.error,
        ),
      );
      continue;
    }

    // Collect unique primaryOwners
    if (
      validationResult.primaryOwners &&
      validationResult.primaryOwners.length > 0
    ) {
      validationResult.primaryOwners.forEach((owner) => {
        if (owner && owner.trim()) {
          uniquePrimaryOwners.add(owner.trim());
        }
      });
    }
  }

  // Generate createdAt from month and year
  const createdAt = generateCreatedAt(month, year);

  // Create preview items for unique primaryOwners
  for (const ownerName of Array.from(uniquePrimaryOwners).sort()) {
    // Check if risk owner already exists
    const status = existingRiskOwnerNames.has(ownerName)
      ? PreviewStatus.DUPLICATE
      : PreviewStatus.READY;

    previewItems.push({
      rowData: {
        title: ownerName,
        createdAt: createdAt,
      },
      _data: {
        row: 2, // Default row number as specified in requirements
        sheetName: sheetName,
        warnings: [],
        status,
      },
    });
  }

  return {
    previewItems,
    invalidItemsDetails,
    invalidItemsCount: invalidItems,
    uniquePrimaryOwners,
  };
}
