import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportLogService } from '../import-log/import-log.service';
import { PreviewStatus } from '../../common/utils/preview-status.enum';
import {
  parseFileBuffer,
  isLikelyCsv,
} from '../../common/utils/file-parser.util';
import { normalizeTextForComparison } from '../../common/utils/text.util';
import { downloadExcelWithHighlights } from '../../common/utils/excel-highlight.util';
import { generateCreatedAt } from '../../common/utils/date.util';
import { convertWorkbookDataToExcelBuffer } from '../../common/utils/excel-parser.util';
import {
  ServicesImportPreviewResponseDto,
  ServicePreviewItem,
} from './dto/preview-response.dto';
import {
  findFirstSheet,
  validateWorkbookHasData,
  validateRequiredColumns,
} from './validators/workbook.validator';
import {
  validateServiceRow,
  createInvalidItemDto,
} from './validators/service-row.validator';
import { isEmptyOrHeaderRow, parseServiceRow } from './utils/row-parser.util';
import { ServiceRow } from './types';
import { slugify } from '../../common/utils/slugify.util';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importLogService: ImportLogService,
  ) {}

  async validateAndPreview(
    fileBuffer: Buffer,
    month: string,
    year: string,
    filename?: string,
  ): Promise<ServicesImportPreviewResponseDto> {
    try {
      const workbook = parseFileBuffer(fileBuffer, filename);

      // Validate workbook structure
      const sheetName = findFirstSheet(workbook);
      const allRows = workbook[sheetName] as ServiceRow[];

      // Filter out empty rows (rows with no keys or all empty values)
      const rows = allRows.filter((row) => {
        if (!row || typeof row !== 'object') return false;
        const keys = Object.keys(row);
        if (keys.length === 0) return false;
        // Check if row has at least one non-empty value
        return keys.some((key) => {
          const value = row[key as keyof ServiceRow];
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

      // Generate createdAt from month and year
      const createdAt = generateCreatedAt(month, year);

      const previewItems: ServicePreviewItem[] = [];
      const invalidItemsDetails = [];
      let invalidItems = 0;

      // Pre-fetch all RiskCategories for optimization (single query)
      const riskCategories = await this.prisma.riskCategory.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
        },
      });

      // Create a Map from slug to RiskCategory for fast lookup
      const riskCategoryMap = new Map(
        riskCategories.map((rc) => [rc.slug, rc]),
      );

      // Pre-fetch all existing services grouped by riskCategoryId for duplicate detection
      const allExistingServices = await this.prisma.service.findMany({
        where: {
          deletedAt: null,
        },
        select: {
          title: true,
          riskCategoryId: true,
        },
      });

      // Create a Map from riskCategoryId to array of normalized titles for fast lookup
      const servicesByCategoryMap = new Map<string, Set<string>>();
      for (const service of allExistingServices) {
        const normalizedTitle = normalizeTextForComparison(service.title);
        if (!servicesByCategoryMap.has(service.riskCategoryId)) {
          servicesByCategoryMap.set(service.riskCategoryId, new Set());
        }
        servicesByCategoryMap.get(service.riskCategoryId).add(normalizedTitle);
      }

      // Process each row
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const excelRowNumber = rowIndex + 2; // +2 because Excel rows start at 1 and we skip header

        const parsedRow = parseServiceRow(row);

        // Skip empty rows and header rows
        if (isEmptyOrHeaderRow(parsedRow.title)) {
          continue;
        }

        // Validate row
        const validationResult = validateServiceRow(
          row,
          riskCategoryMap,
          excelRowNumber,
        );

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

        // Process each risk category from the comma-separated list
        const riskCategoriesStr = parsedRow.riskCategories;
        const categoryNames = riskCategoriesStr
          .split(',')
          .map((cat) => cat.trim())
          .filter((cat) => cat.length > 0);

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
            continue; // Skip if category not found (shouldn't happen after validation)
          }

          // Check for duplicate record (same title, riskCategory)
          let status =
            validationResult.warnings.length > 0
              ? PreviewStatus.NEED_REVIEW
              : PreviewStatus.READY;

          // Normalize title for case-insensitive comparison
          const normalizedTitle = normalizeTextForComparison(parsedRow.title);

          // Check if normalized title already exists for this riskCategoryId
          const normalizedTitlesForCategory = servicesByCategoryMap.get(
            riskCategory.id,
          );

          if (normalizedTitlesForCategory?.has(normalizedTitle)) {
            status = PreviewStatus.DUPLICATE;
          }

          previewItems.push({
            rowData: {
              title: parsedRow.title.trim(),
              link: parsedRow.link.trim(),
              description: parsedRow.description.trim(),
              providerName: parsedRow.partnerName.trim(),
              riskCategoryId: riskCategory.id,
              riskCategorySlug: riskCategory.slug,
              riskCategoryName: riskCategory.name,
              createdAt: createdAt,
            },
            _data: {
              row: excelRowNumber,
              sheetName: sheetName,
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

      // Only import items with allowed statuses
      for (const item of preview.data) {
        // Skip items with DUPLICATE status
        if (item._data.status === PreviewStatus.DUPLICATE) {
          console.warn(
            `Services: skipping duplicate item - title='${item.rowData.title}', riskCategory='${item.rowData.riskCategorySlug}'`,
          );
          continue;
        }

        // Skip items that don't have an allowed status
        if (!allowedStatusesSet.has(item._data.status)) {
          console.warn(
            `Services: skipping item with status '${item._data.status}' - title='${item.rowData.title}', riskCategory='${item.rowData.riskCategorySlug}'`,
          );
          continue;
        }

        if (!item.rowData.riskCategoryId) {
          console.warn(
            `Services: skipping item without riskCategoryId - ${item.rowData.title}`,
          );
          continue;
        }

        const serviceData = {
          title: item.rowData.title,
          link: item.rowData.link,
          description: item.rowData.description,
          providerName: item.rowData.providerName,
          riskCategoryId: item.rowData.riskCategoryId,
          createdAt: item.rowData.createdAt,
        };

        try {
          const created = await this.prisma.service.create({
            data: serviceData,
          });
          console.log(
            `Created Service: id=${created.id}, title='${item.rowData.title}', riskCategory='${item.rowData.riskCategorySlug}'`,
          );
          importedCount++;
        } catch (createError: any) {
          // Check if it's a unique constraint violation or duplicate
          if (
            createError?.code === 'P2002' ||
            createError?.message?.includes('Unique constraint')
          ) {
            console.warn(
              `Skipping duplicate Service for title='${item.rowData.title}', riskCategory='${item.rowData.riskCategorySlug}': ${createError.message}`,
            );
            // Append-only: duplicates are skipped, not updated
          } else {
            console.error(
              `Failed to create Service for title='${item.rowData.title}', riskCategory='${item.rowData.riskCategorySlug}':`,
              createError,
            );
            throw createError;
          }
        }
      }

      // Verify that records were actually created
      const actualCount = await this.prisma.service.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60000), // Within last minute
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
        message: `Services uploaded successfully`,
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
