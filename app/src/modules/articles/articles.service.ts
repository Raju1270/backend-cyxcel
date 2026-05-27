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
import { convertWorkbookDataToExcelBuffer } from '../../common/utils/excel-parser.util';
import {
  ArticlesImportPreviewResponseDto,
  ArticlePreviewItem,
} from './dto/preview-response.dto';
import { isValidDateRange } from './validators/date.validator';
import {
  findTeamSheet,
  validateWorkbookHasData,
  validateRequiredColumns,
} from './validators/workbook.validator';
import {
  validateArticleRow,
  createInvalidItemDto,
} from './validators/article-row.validator';
import { isEmptyOrHeaderRow, parseArticleRow } from './utils/row-parser.util';
import { ArticleRow } from './types';
import { InvalidItemDto } from '../../common/dto/import-common.dto';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importLogService: ImportLogService,
  ) {}

  async validateAndPreview(
    fileBuffer: Buffer,
    month: string,
    year: string,
    filename?: string,
  ): Promise<ArticlesImportPreviewResponseDto> {
    try {
      const workbook = parseFileBuffer(fileBuffer, filename);

      // Validate workbook structure
      const sheetName = findTeamSheet(workbook);
      const allRows = (workbook[sheetName] ?? []) as ArticleRow[];

      // Filter out empty rows (rows with no keys or all empty values)
      const rows = allRows.filter((row) => {
        if (!row || typeof row !== 'object') return false;
        const keys = Object.keys(row);
        if (keys.length === 0) return false;
        // Check if row has at least one non-empty value
        return keys.some((key) => {
          const value = row[key as keyof ArticleRow];
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

      const previewItems: ArticlePreviewItem[] = [];
      const invalidItemsDetails: InvalidItemDto[] = [];
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

      // Pre-fetch all existing articles grouped by riskCategoryId for duplicate detection
      // This avoids repeated database queries in the loop
      const allExistingArticles = await this.prisma.thoughtLeadership.findMany({
        select: {
          title: true,
          riskCategoryId: true,
        },
      });

      // Create a Map from riskCategoryId to array of normalized titles for fast lookup
      const articlesByCategoryMap = new Map<string, Set<string>>();
      for (const article of allExistingArticles) {
        const normalizedTitle = normalizeTextForComparison(article.title);
        if (!articlesByCategoryMap.has(article.riskCategoryId)) {
          articlesByCategoryMap.set(article.riskCategoryId, new Set());
        }
        const categorySet = articlesByCategoryMap.get(article.riskCategoryId);
        if (categorySet) {
          categorySet.add(normalizedTitle);
        }
      }

      // Process each row
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const excelRowNumber = rowIndex + 2; // +2 because Excel rows start at 1 and we skip header

        const parsedRow = parseArticleRow(row);

        // Skip empty rows and header rows
        if (isEmptyOrHeaderRow(parsedRow.title)) {
          continue;
        }

        // Validate row
        const validationResult = validateArticleRow(
          row,
          riskCategoryMap,
          excelRowNumber,
        );

        // Handle invalid rows
        if (!validationResult.isValid) {
          invalidItems++;
          if (validationResult.error) {
            invalidItemsDetails.push(
              createInvalidItemDto(
                row,
                excelRowNumber,
                sheetName,
                validationResult.error,
              ),
            );
          }
          continue;
        }

        // Check for duplicate record (same title, riskCategory)
        let status =
          validationResult.warnings.length > 0
            ? PreviewStatus.NEED_REVIEW
            : PreviewStatus.READY;

        // Normalize title for case-insensitive comparison
        const normalizedTitle = normalizeTextForComparison(parsedRow.title);

        // Check if normalized title already exists for this riskCategoryId
        // This handles case-insensitive and whitespace-normalized comparison
        const normalizedTitlesForCategory = articlesByCategoryMap.get(
          validationResult.riskCategory?.id ?? '',
        );

        if (normalizedTitlesForCategory?.has(normalizedTitle)) {
          status = PreviewStatus.DUPLICATE;
        }

        const riskCategory = validationResult.riskCategory;
        const publishedDate = validationResult.publishedDate;
        if (!riskCategory || !publishedDate) {
          continue;
        }

        previewItems.push({
          rowData: {
            title: parsedRow.title.trim(),
            link: parsedRow.link.trim(),
            publishedDate: publishedDate.toISOString(),
            riskCategoryId: riskCategory.id,
            riskCategorySlug: riskCategory.slug,
            riskCategoryName: riskCategory.name,
          },
          _data: {
            row: excelRowNumber,
            sheetName: sheetName,
            warnings: validationResult.warnings,
            status,
          },
        });
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
        `Error processing workbook: ${errorMessage}${
          errorStack ? `\nStack: ${errorStack}` : ''
        }`,
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
            `Articles: skipping duplicate item - title='${item.rowData.title}', riskCategory='${item.rowData.riskCategorySlug}'`,
          );
          continue;
        }

        // Skip items that don't have an allowed status
        if (!allowedStatusesSet.has(item._data.status)) {
          console.warn(
            `Articles: skipping item with status '${item._data.status}' - title='${item.rowData.title}', riskCategory='${item.rowData.riskCategorySlug}'`,
          );
          continue;
        }

        if (!item.rowData.riskCategoryId) {
          console.warn(
            `Articles: skipping item without riskCategoryId - ${item.rowData.title}`,
          );
          continue;
        }

        // Validate and parse publishedDate
        const publishedDate = new Date(item.rowData.publishedDate);
        if (!isValidDateRange(publishedDate)) {
          console.warn(
            `Articles: skipping item with invalid date '${item.rowData.publishedDate}' - title='${item.rowData.title}', riskCategory='${item.rowData.riskCategorySlug}'`,
          );
          continue;
        }

        const articleData = {
          title: item.rowData.title,
          link: item.rowData.link,
          publishedDate,
          riskCategoryId: item.rowData.riskCategoryId,
          createdAt,
        };

        try {
          const created = await this.prisma.thoughtLeadership.create({
            data: articleData,
          });
          console.log(
            `Created ThoughtLeadership: id=${created.id}, title='${item.rowData.title}', riskCategory='${item.rowData.riskCategorySlug}'`,
          );
          importedCount++;
        } catch (createError: unknown) {
          // Check if it's a unique constraint violation or duplicate
          const isPrismaError =
            typeof createError === 'object' &&
            createError !== null &&
            'code' in createError &&
            createError.code === 'P2002';
          const hasUniqueConstraintMessage =
            typeof createError === 'object' &&
            createError !== null &&
            'message' in createError &&
            typeof createError.message === 'string' &&
            createError.message.includes('Unique constraint');

          if (isPrismaError || hasUniqueConstraintMessage) {
            const errorMessage =
              typeof createError === 'object' &&
              createError !== null &&
              'message' in createError &&
              typeof createError.message === 'string'
                ? createError.message
                : 'Unknown error';
            console.warn(
              `Skipping duplicate ThoughtLeadership for title='${item.rowData.title}', riskCategory='${item.rowData.riskCategorySlug}': ${errorMessage}`,
            );
            // Append-only: duplicates are skipped, not updated
          } else {
            console.error(
              `Failed to create ThoughtLeadership for title='${item.rowData.title}', riskCategory='${item.rowData.riskCategorySlug}':`,
              createError,
            );
            throw createError;
          }
        }
      }

      // Verify that records were actually created
      const actualCount = await this.prisma.thoughtLeadership.count({
        where: {
          createdAt: createdAt,
        },
      });

      console.log(
        `Import completed: reported ${importedCount} imported, actual count in DB with createdAt=${createdAt.toISOString()}: ${actualCount}`,
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
        message: `Articles uploaded successfully`,
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
        `Error importing data: ${errorMessage}${
          errorStack ? `\nStack: ${errorStack}` : ''
        }`,
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
      // The downloadExcelWithHighlights function expects Excel buffer
      const workbook = parseFileBuffer(fileBuffer, filename);
      const excelBuffer = convertWorkbookDataToExcelBuffer(workbook, 'Team');

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
