import ExcelJS from 'exceljs';
import { PreviewStatus } from './preview-status.enum';
import { InvalidItemDto } from '../dto/import-common.dto';

/**
 * Interface for preview items that can be used for Excel highlighting
 */
export interface HighlightablePreviewItem {
  _data: {
    row: number;
    sheetName: string;
    status: PreviewStatus;
    warnings?: string[];
  };
}

/**
 * Highlights rows in an Excel file based on preview data
 * @param fileBuffer - The original Excel file buffer
 * @param data - Array of preview items with row information and status
 * @param invalidItems - Optional array of invalid items with error messages
 * @returns Buffer containing the highlighted Excel file
 */
export async function downloadExcelWithHighlights<
  T extends HighlightablePreviewItem,
>(
  fileBuffer: Buffer,
  data: T[],
  invalidItems?: InvalidItemDto[],
): Promise<Buffer> {
  // Validate file buffer
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error(
      'File buffer is empty or invalid. Please ensure you are uploading a valid Excel file.',
    );
  }

  // Read the original Excel workbook using ExcelJS
  const workbook = new ExcelJS.Workbook();
  try {
    // ExcelJS accepts Buffer, but TypeScript types may be strict
    // @ts-expect-error - ExcelJS accepts Buffer at runtime
    await workbook.xlsx.load(fileBuffer);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to load Excel file: ${errorMessage}. Please ensure the file is a valid Excel file (XLSX or XLS format).`,
    );
  }

  // Create a map of sheet name -> row number -> { status, warnings, error } for quick lookup
  const rowDataMap = new Map<
    string,
    Map<number, { status?: PreviewStatus; warnings?: string[]; error?: string }>
  >();

  // Add valid items to the map
  for (const item of data) {
    const sheetName = item._data.sheetName;
    const rowNumber = item._data.row;

    if (!rowDataMap.has(sheetName)) {
      rowDataMap.set(sheetName, new Map());
    }
    rowDataMap.get(sheetName).set(rowNumber, {
      status: item._data.status,
      warnings: item._data.warnings || [],
    });
  }

  // Add invalid items to the map
  if (invalidItems && invalidItems.length > 0) {
    for (const invalidItem of invalidItems) {
      const sheetName = invalidItem._data.sheetName;
      const rowNumber = invalidItem._data.row;

      if (!rowDataMap.has(sheetName)) {
        rowDataMap.set(sheetName, new Map());
      }
      // If row already exists (shouldn't happen, but handle gracefully), merge error
      const existingData = rowDataMap.get(sheetName).get(rowNumber);
      if (existingData) {
        existingData.error = invalidItem._data.error;
      } else {
        rowDataMap.get(sheetName).set(rowNumber, {
          error: invalidItem._data.error,
        });
      }
    }
  }

  // Apply highlighting to each sheet
  workbook.eachSheet((worksheet) => {
    const rowDataMapForSheet = rowDataMap.get(worksheet.name);
    console.log(
      'worksheet name: ',
      worksheet.name,
      'rowDataMap size: ',
      rowDataMapForSheet?.size,
    );
    if (!rowDataMapForSheet) return;

    // Only highlight rows that are in the rowDataMap (rows that were validated)
    // This prevents highlighting empty rows that ExcelJS might include
    for (const [rowNumber, rowData] of rowDataMapForSheet.entries()) {
      console.log('rowNumber: ', rowNumber, 'status: ', rowData.status);
      // Skip header row (row 1)
      if (rowNumber === 1) continue;

      // Get the row from worksheet
      const row = worksheet.getRow(rowNumber);

      // Check if row exists and has data (not empty)
      if (!row || row.cellCount === 0) continue;

      // Determine if row should be highlighted and get border color and comment text
      let borderColor: { argb: string } | null = null;
      let commentText: string | null = null;

      // Priority: invalid items (error) > DUPLICATE > NEED_REVIEW
      if (rowData.error) {
        // Dark red border for invalid items (errors)
        borderColor = { argb: 'FF8B0000' }; // Dark red
        commentText = rowData.error;
      } else if (rowData.status === PreviewStatus.DUPLICATE) {
        // Red border for DUPLICATE
        borderColor = { argb: 'FFFF0000' }; // Red
        commentText =
          rowData.warnings && rowData.warnings.length > 0
            ? rowData.warnings.join('\n')
            : 'Duplicate record';
      } else if (rowData.status === PreviewStatus.NEED_REVIEW) {
        // Orange border for NEED_REVIEW
        borderColor = { argb: 'FFFF8800' }; // Orange
        commentText =
          rowData.warnings && rowData.warnings.length > 0
            ? rowData.warnings.join('\n')
            : 'Needs review';
      }

      // Apply border highlighting and comments if needed
      if (borderColor && commentText) {
        row.eachCell((cell) => {
          // Apply border styling
          cell.border = {
            top: { style: 'thin', color: borderColor },
            bottom: { style: 'thin', color: borderColor },
            left: { style: 'thin', color: borderColor },
            right: { style: 'thin', color: borderColor },
          };

          // Add comment with error/warning text
          cell.note = commentText!;
        });
      }
    }
  });

  // Convert workbook to buffer
  const outputBuffer = await workbook.xlsx.writeBuffer();
  // ExcelJS writeBuffer returns a Buffer-like object, ensure it's a proper Buffer
  return outputBuffer instanceof Buffer
    ? outputBuffer
    : Buffer.from(outputBuffer);
}
