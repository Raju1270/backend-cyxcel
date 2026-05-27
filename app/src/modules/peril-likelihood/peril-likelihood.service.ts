import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportLogService } from '../import-log/import-log.service';
import { PreviewStatus } from '../../common/utils/preview-status.enum';
import { getWorkbookAsJsonFromBuffer } from '../../common/utils/excel-parser.util';
import { slugify } from '../../common/utils/slugify.util';
import { downloadExcelWithHighlights } from '../../common/utils/excel-highlight.util';
import {
  PerilLikelihoodImportPreviewResponseDto,
  PerilLikelihoodPreviewItem,
} from './dto/preview-response.dto';
import {
  filterAllowedSheets,
  findMissingSheets,
  validateRequiredColumnsForSheet,
} from './validators/workbook.validator';
import {
  validatePerilRow,
  createInvalidItemDto,
} from './validators/peril-row.validator';
import { isEmptyOrHeaderRow, parsePerilRow } from './utils/row-parser.util';

type LatestPerilLikelihoodRow = {
  Title: string;
  [key: `EU ${string}`]: string | number | undefined;
  [key: `US ${string}`]: string | number | undefined;
  [key: `UK ${string}`]: string | number | undefined;
};

@Injectable()
export class PerilLikelihoodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importLogService: ImportLogService,
  ) {}

  async validateAndPreview(
    fileBuffer: Buffer,
    month: string,
    year: string,
  ): Promise<PerilLikelihoodImportPreviewResponseDto> {
    const monthAsString = new Date(`${year}-${month}-02`).toLocaleString(
      'default',
      {
        month: 'long',
      },
    );

    try {
      const workbook = getWorkbookAsJsonFromBuffer(fileBuffer);

      // Validate workbook structure
      const sheetsToProcess = filterAllowedSheets(workbook);

      // Collect global warnings
      const globalWarnings: string[] = [];

      // Check for missing sheets
      const missingSheets = findMissingSheets(workbook);
      if (missingSheets.length > 0) {
        missingSheets.forEach((sheet) => {
          globalWarnings.push(`Sheet '${sheet}' not found in workbook`);
        });
      }

      // Required columns for each sheet
      const euColumn = `EU ${monthAsString.toUpperCase()} ${year}`;
      const usColumn = `US ${monthAsString.toUpperCase()} ${year}`;
      const ukColumn = `UK ${monthAsString.toUpperCase()} ${year}`;

      // Check for missing required columns in each sheet
      for (const sheetName of sheetsToProcess) {
        const rows = workbook[sheetName] as LatestPerilLikelihoodRow[];
        const columnWarnings = validateRequiredColumnsForSheet(
          rows,
          sheetName,
          euColumn,
          usColumn,
          ukColumn,
        );
        globalWarnings.push(...columnWarnings);
      }

      const previewItems: PerilLikelihoodPreviewItem[] = [];
      const invalidItemsDetails = [];
      let invalidItems = 0;

      // Process each sheet
      for (const sheetName of sheetsToProcess) {
        const rows = workbook[sheetName] as LatestPerilLikelihoodRow[];

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          const excelRowNumber = rowIndex + 2; // +2 because Excel rows start at 1 and we skip header

          const parsedRow = parsePerilRow(row);

          // Skip empty rows and header rows
          if (isEmptyOrHeaderRow(parsedRow.title)) {
            continue;
          }

          const slug = slugify(parsedRow.title);

          // Prefer unique slug lookup; fallback to name if needed
          const existingPeril =
            (await this.prisma.peril.findFirst({ where: { slug } })) ||
            (await this.prisma.peril.findFirst({
              where: { name: parsedRow.title },
            }));

          if (!existingPeril) {
            const errorMessage = `Peril not found for title='${parsedRow.title}' (slug='${slug}')`;
            invalidItems++;
            invalidItemsDetails.push(
              createInvalidItemDto(
                row,
                excelRowNumber,
                sheetName,
                errorMessage,
              ),
            );
            continue;
          }

          // Validate row
          const validationResult = validatePerilRow(
            row,
            existingPeril,
            euColumn,
            usColumn,
            ukColumn,
            sheetName,
            excelRowNumber,
          );

          // Check for duplicate record
          let status =
            validationResult.warnings.length > 0
              ? PreviewStatus.NEED_REVIEW
              : PreviewStatus.READY;

          // dated 02 of the month to account for timezone differences
          const createdAt = new Date(`${year}-${month}-02`);

          // Check if a record exists with matching perilId and createdAt
          const existingRecord = await this.prisma.perilLikelihood.findFirst({
            where: {
              perilId: existingPeril.id,
              createdAt,
            },
          });

          if (existingRecord) {
            status = PreviewStatus.DUPLICATE;
          }

          previewItems.push({
            rowData: {
              perilId: existingPeril.id,
              perilName: parsedRow.title,
              perilSlug: slug,
              eu: validationResult.eu,
              us: validationResult.us,
              uk: validationResult.uk,
            },
            _data: {
              row: excelRowNumber,
              sheetName,
              warnings: validationResult.warnings,
              status,
            },
          });
        }
      }

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
        monthAsString,
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
      const preview = await this.validateAndPreview(fileBuffer, month, year);

      // dated 02 of the month to account for timezone differences
      const createdAt = new Date(`${year}-${month}-02`);

      let importedCount = 0;

      // Filter items based on allowed statuses
      // Never import items with DUPLICATE status
      const allowedStatusesSet = new Set(allowedStatuses);
      if (allowedStatusesSet.has(PreviewStatus.DUPLICATE)) {
        throw new BadRequestException(
          'DUPLICATE status is not allowed for import. Items with DUPLICATE status will never be imported.',
        );
      }

      // Only import items with allowed statuses
      for (const item of preview.data) {
        // Skip items with DUPLICATE status
        if (item._data.status === PreviewStatus.DUPLICATE) {
          console.warn(
            `${preview.monthAsString} likelihoods: skipping duplicate item - perilId=${item.rowData.perilId}, perilName='${item.rowData.perilName}'`,
          );
          continue;
        }

        // Skip items that don't have an allowed status
        if (!allowedStatusesSet.has(item._data.status)) {
          console.warn(
            `${preview.monthAsString} likelihoods: skipping item with status '${item._data.status}' - perilId=${item.rowData.perilId}, perilName='${item.rowData.perilName}'`,
          );
          continue;
        }

        if (!item.rowData.perilId) {
          console.warn(
            `${preview.monthAsString} likelihoods: skipping item without perilId - ${item.rowData.perilName}`,
          );
          continue;
        }

        const likelihoodData = {
          perilId: item.rowData.perilId,
          eu: item.rowData.eu,
          us: item.rowData.us,
          uk: item.rowData.uk,
          createdAt,
        };

        try {
          const created = await this.prisma.perilLikelihood.create({
            data: likelihoodData,
          });
          console.log(
            `Created PerilLikelihood: id=${created.id}, perilId=${item.rowData.perilId}, perilName='${item.rowData.perilName}', sheet='${item._data.sheetName}'`,
          );
          importedCount++;
        } catch (createError: any) {
          // Check if it's a unique constraint violation or duplicate
          if (
            createError?.code === 'P2002' ||
            createError?.message?.includes('Unique constraint')
          ) {
            console.warn(
              `Skipping duplicate PerilLikelihood for perilId=${item.rowData.perilId}, perilName='${item.rowData.perilName}', sheet='${item._data.sheetName}': ${createError.message}`,
            );
            // Append-only: duplicates are skipped, not updated
          } else {
            console.error(
              `Failed to create PerilLikelihood for perilId=${item.rowData.perilId}, perilName='${item.rowData.perilName}', sheet='${item._data.sheetName}':`,
              createError,
            );
            throw createError;
          }
        }
      }

      // Verify that records were actually created
      const actualCount = await this.prisma.perilLikelihood.count({
        where: {
          createdAt: createdAt,
        },
      });

      console.log(
        `Import completed: reported ${importedCount} imported, actual count in DB: ${actualCount}`,
      );

      if (actualCount === 0 && importedCount > 0) {
        console.error(
          `WARNING: Import reported ${importedCount} records, but no records found in DB with createdAt=${createdAt.toISOString()}`,
        );
      }

      // Create ImportLog record for successful import
      if (userId && filename) {
        await this.importLogService.createSuccessLog(
          userId,
          filename,
          actualCount,
        );
      }

      return {
        message: `${preview.monthAsString} peril likelihoods uploaded successfully`,
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
  ): Promise<Buffer> {
    // Get preview data to determine which rows need highlighting
    const preview = await this.validateAndPreview(fileBuffer, month, year);

    // Use the reusable utility function, passing both valid items and invalid items
    return downloadExcelWithHighlights(
      fileBuffer,
      preview.data,
      preview.invalidItemsDetails,
    );
  }
}
