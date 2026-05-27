import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportLogService } from '../import-log/import-log.service';
import { PreviewStatus } from '../../common/utils/preview-status.enum';
import {
  parseFileBuffer,
  isLikelyCsv,
} from '../../common/utils/file-parser.util';
import { downloadExcelWithHighlights } from '../../common/utils/excel-highlight.util';
import { convertWorkbookDataToExcelBuffer } from '../../common/utils/excel-parser.util';
import {
  RiskOwnersImportPreviewResponseDto,
  RiskOwnerPreviewItem,
} from './dto/preview-response.dto';
import {
  findFirstSheet,
  validateWorkbookHasData,
  validateRequiredColumns,
} from './validators/workbook.validator';
import { RiskOwnerRow } from './types';
import { parseRiskOwnersData } from './utils/risk-owners-parser.util';

@Injectable()
export class RiskOwnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importLogService: ImportLogService,
  ) {}

  async validateAndPreview(
    fileBuffer: Buffer,
    month: string,
    year: string,
    filename?: string,
  ): Promise<RiskOwnersImportPreviewResponseDto> {
    try {
      const workbook = parseFileBuffer(fileBuffer, filename);

      // Validate workbook structure
      const rawSheetName = findFirstSheet(workbook);

      // For CSV files, sheetName should be empty string
      const isCsv =
        filename?.toLowerCase().endsWith('.csv') || isLikelyCsv(fileBuffer);
      const sheetName = isCsv ? '' : rawSheetName;

      const allRows = workbook[rawSheetName] as RiskOwnerRow[];

      // Filter out empty rows
      const rows = allRows.filter((row) => {
        if (!row || typeof row !== 'object') return false;
        const keys = Object.keys(row);
        if (keys.length === 0) return false;
        return keys.some((key) => {
          const value = row[key as keyof RiskOwnerRow];
          return (
            value !== undefined && value !== null && String(value).trim() !== ''
          );
        });
      });

      validateWorkbookHasData(rows, sheetName);

      // Validate required columns - find first non-empty row
      const firstNonEmptyRow = rows.find((row) => {
        const keys = Object.keys(row);
        return keys.length > 0;
      });

      const globalWarnings = firstNonEmptyRow
        ? validateRequiredColumns(firstNonEmptyRow, sheetName)
        : [];

      // Pre-fetch all existing RiskOwner records for duplicate detection
      const existingRiskOwners = await this.prisma.riskOwner.findMany({
        select: {
          id: true,
          name: true,
        },
      });

      // Create a Set from RiskOwner names for fast lookup
      const existingRiskOwnerNames = new Set(
        existingRiskOwners.map((ro) => ro.name),
      );

      // Parse risk owners data
      const parsedData = parseRiskOwnersData({
        rows,
        sheetName,
        existingRiskOwnerNames,
        month,
        year,
      });

      const previewItems = parsedData.previewItems;
      const invalidItemsDetails = parsedData.invalidItemsDetails;
      const invalidItems = parsedData.invalidItemsCount;

      // Count items by status
      const needReviewCount = previewItems.filter(
        (item) => item._data.status === PreviewStatus.NEED_REVIEW,
      ).length;
      const readyCount = previewItems.filter(
        (item) => item._data.status === PreviewStatus.READY,
      ).length;
      const duplicateCount = previewItems.filter(
        (item) => item._data.status === PreviewStatus.DUPLICATE,
      ).length;

      return {
        month,
        year,
        data: previewItems,
        totals: {
          all: previewItems.length + invalidItems,
          need_review: needReviewCount,
          ready: readyCount,
          duplicate: duplicateCount,
          invalid: invalidItems,
        },
        invalidItemsDetails,
        warnings: globalWarnings.length > 0 ? globalWarnings : undefined,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      throw new BadRequestException(
        `Error processing workbook: ${errorMessage}${errorStack ? `\nStack: ${errorStack}` : ''}`,
      );
    }
  }

  async importData(
    fileBuffer: Buffer,
    month: string,
    year: string,
    allowedStatuses: PreviewStatus[] = [PreviewStatus.READY],
    userId?: string,
    filename?: string,
  ): Promise<{ message: string; imported: number; actualImported: number }> {
    try {
      // Validate and get preview data first
      const preview = await this.validateAndPreview(
        fileBuffer,
        month,
        year,
        filename,
      );

      let importedCount = 0;

      // Filter items based on allowed statuses
      // Never import items with DUPLICATE status
      const allowedStatusesSet = new Set(allowedStatuses);
      if (allowedStatusesSet.has(PreviewStatus.DUPLICATE)) {
        throw new BadRequestException(
          'DUPLICATE status is not allowed for import. Items with DUPLICATE status will never be imported.',
        );
      }

      // Process each item
      for (const item of preview.data) {
        // Skip items with DUPLICATE status
        if (item._data.status === PreviewStatus.DUPLICATE) {
          console.warn(
            `Risk Owners: skipping duplicate item - title='${item.rowData.title}'`,
          );
          continue;
        }

        // Skip items that don't have an allowed status
        if (!allowedStatusesSet.has(item._data.status)) {
          console.warn(
            `Risk Owners: skipping item with status '${item._data.status}' - title='${item.rowData.title}'`,
          );
          continue;
        }

        try {
          // Create or update RiskOwner
          const riskOwner = await this.prisma.riskOwner.upsert({
            where: { name: item.rowData.title },
            update: {
              // Don't update createdAt for existing records
            },
            create: {
              name: item.rowData.title,
              createdAt: item.rowData.createdAt,
            },
          });

          console.log(
            `Created/Updated RiskOwner: id=${riskOwner.id}, name='${item.rowData.title}'`,
          );
          importedCount++;
        } catch (createError: any) {
          console.error(
            `Failed to create/update RiskOwner for name='${item.rowData.title}':`,
            createError,
          );
          throw createError;
        }
      }

      // Verify that records were actually created/updated
      const actualCount = await this.prisma.riskOwner.count({
        where: {
          name: {
            in: preview.data
              .filter((item) => {
                const status = item._data.status;
                return (
                  status !== PreviewStatus.DUPLICATE &&
                  allowedStatusesSet.has(status)
                );
              })
              .map((item) => item.rowData.title),
          },
        },
      });

      console.log(
        `Import completed: reported ${importedCount} imported, actual count in DB: ${actualCount}`,
      );

      // Create ImportLog record for successful import
      if (userId && filename) {
        await this.importLogService.createSuccessLog(
          userId,
          filename,
          actualCount,
        );
      }

      return {
        message: `Risk owners uploaded successfully`,
        imported: importedCount,
        actualImported: actualCount,
      };
    } catch (error) {
      // Create ImportLog record for failed import
      if (userId && filename) {
        await this.importLogService.createFailedLog(userId, filename, 0);
      }

      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      throw new BadRequestException(
        `Error importing data: ${errorMessage}${errorStack ? `\nStack: ${errorStack}` : ''}`,
      );
    }
  }

  async downloadExcelWithHighlights(
    fileBuffer: Buffer,
    month: string,
    year: string,
    filename?: string,
  ): Promise<Buffer> {
    // Validate file buffer is not empty
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('File buffer is empty or invalid');
    }

    // Get preview data to determine which rows need highlighting
    const preview = await this.validateAndPreview(
      fileBuffer,
      month,
      year,
      filename,
    );

    // Check if input is CSV - if so, we need to convert it to Excel format first
    const isCsv =
      filename?.toLowerCase().endsWith('.csv') || isLikelyCsv(fileBuffer);

    if (isCsv) {
      // For CSV files, we need to convert to Excel format for highlighting
      const workbook = parseFileBuffer(fileBuffer, filename);
      const sheetName = findFirstSheet(workbook);
      const excelBuffer = convertWorkbookDataToExcelBuffer(workbook, sheetName);

      // Use the Excel buffer for highlighting
      return downloadExcelWithHighlights(
        excelBuffer,
        preview.data,
        preview.invalidItemsDetails,
      );
    } else {
      // Use the reusable utility function, passing both valid items and invalid items
      return downloadExcelWithHighlights(
        fileBuffer,
        preview.data,
        preview.invalidItemsDetails,
      );
    }
  }
}
