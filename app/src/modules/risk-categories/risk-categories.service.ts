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
import * as XLSX from 'xlsx';
import {
  RiskCategoriesImportPreviewResponseDto,
  RiskCategoryPreviewItem,
} from './dto/preview-response.dto';
import { findTier1LossDataSheet } from './validators/workbook.validator';
import { slugify } from '../../common/utils/slugify.util';
import { convertParsedDataToLossData } from './utils/loss-data-mapping.util';
import { parseTier1LossDataSheet } from './utils/tier1-loss-data-parser.util';

@Injectable()
export class RiskCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importLogService: ImportLogService,
  ) {}

  async validateAndPreview(
    fileBuffer: Buffer,
    month: string,
    year: string,
    filename?: string,
  ): Promise<RiskCategoriesImportPreviewResponseDto> {
    try {
      // Parse Excel file using XLSX directly to access raw worksheet data
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      // Find the Tier 1 Loss Data Sheet (case-insensitive)
      const sheetName = workbook.SheetNames.find(
        (name) => name.toLowerCase() === 'tier 1 loss data sheet',
      );

      if (!sheetName) {
        throw new BadRequestException(
          `Sheet 'Tier 1 Loss Data Sheet' not found in the workbook. Available sheets: ${workbook.SheetNames.join(', ')}`,
        );
      }

      // Parse the sheet using the new parser
      const parsedData = parseTier1LossDataSheet(workbook, sheetName);

      if (parsedData.verticals.length === 0) {
        throw new BadRequestException(
          `No vertical data found in sheet '${sheetName}'. 
          Expected verticals: Cyber, Supply Chain, Tech (IT/OT), 
          Corporate Responsibility, Geopolitics, AI Governance.`,
        );
      }

      // Generate createdAt from month and year
      const createdAt = generateCreatedAt(month, year);

      const previewItems: RiskCategoryPreviewItem[] = [];
      const invalidItemsDetails = [];
      let invalidItems = 0;
      const globalWarnings: string[] = [];

      // Pre-fetch all existing risk categories for duplicate detection
      const allExistingRiskCategories = await this.prisma.riskCategory.findMany(
        {
          select: {
            slug: true,
            name: true,
          },
        },
      );

      // Create a Set of normalized slugs for fast lookup
      const existingSlugsSet = new Set(
        allExistingRiskCategories.map((rc) =>
          normalizeTextForComparison(rc.slug),
        ),
      );

      // Map vertical names to category names
      const verticalToCategoryName: Record<string, string> = {
        'Cyber Vertical': 'Cyber',
        Cyber: 'Cyber',

        'Supply chain vertical': 'Supply Chain',
        'Supply Chain': 'Supply Chain',

        'Regulation vertical': 'Regulation',
        Regulation: 'Regulation',

        'Tech (IT/OT vertical)': 'Technology (IT/OT)',
        'Tech (IT/OT)': 'Technology (IT/OT)',
        'Technology (IT/OT)': 'Technology (IT/OT)',
        'Corporate Responsibility vertical': 'Corporate Responsibility',
        'Corporate Responsibility': 'Corporate Responsibility',
        Geopolitics: 'Geopolitics',
        AI: 'AI Governance',
        'AI Governance': 'AI Governance',
      };

      // Process each vertical
      for (const verticalData of parsedData.verticals) {
        const categoryName =
          verticalToCategoryName[verticalData.vertical] ||
          verticalData.vertical;

        // Validate that we have data
        if (!verticalData.data || verticalData.data.length === 0) {
          invalidItems++;
          invalidItemsDetails.push({
            rowData: { vertical: verticalData.vertical },
            _data: {
              row: 0,
              sheetName: sheetName,
              error: `No data found for vertical '${verticalData.vertical}'`,
            },
          });
          continue;
        }

        // Convert parsed data to LossData format
        const lossData = convertParsedDataToLossData(
          verticalData.vertical,
          verticalData.source,
          verticalData.chartTitle,
          verticalData.data,
        );

        // Generate slug from category name
        const slug = slugify(categoryName);
        const normalizedSlug = normalizeTextForComparison(slug);

        // Check for duplicate record (same slug)
        let status = PreviewStatus.READY;
        if (existingSlugsSet.has(normalizedSlug)) {
          status = PreviewStatus.DUPLICATE;
        }

        // Add warnings if source or chartTitle is missing
        const warnings: string[] = [];
        if (!verticalData.source) {
          warnings.push(
            `Source of the data is missing for vertical '${verticalData.vertical}'`,
          );
        }
        if (!verticalData.chartTitle) {
          warnings.push(
            `Title of the chart is missing for vertical '${verticalData.vertical}'`,
          );
        }

        if (warnings.length > 0) {
          status = PreviewStatus.NEED_REVIEW;
          globalWarnings.push(...warnings);
        }

        previewItems.push({
          rowData: {
            name: categoryName,
            slug: slug,
            lossData: lossData,
            createdAt: createdAt,
          },
          _data: {
            row: 0, // Row number not applicable for multi-vertical structure
            sheetName: sheetName,
            warnings: warnings,
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
            `Risk Categories: skipping duplicate item - name='${item.rowData.name}', slug='${item.rowData.slug}'`,
          );
          continue;
        }

        // Skip items that don't have an allowed status
        if (!allowedStatusesSet.has(item._data.status)) {
          console.warn(
            `Risk Categories: skipping item with status '${item._data.status}' - name='${item.rowData.name}', slug='${item.rowData.slug}'`,
          );
          continue;
        }

        if (!item.rowData.slug) {
          console.warn(
            `Risk Categories: skipping item without slug - ${item.rowData.name}`,
          );
          continue;
        }

        if (!item.rowData.lossData) {
          console.warn(
            `Risk Categories: skipping item without loss data - name='${item.rowData.name}'`,
          );
          continue;
        }

        const riskCategoryData = {
          name: item.rowData.name,
          slug: item.rowData.slug,
          lossData: item.rowData.lossData,
          createdAt: item.rowData.createdAt,
        };

        try {
          const created = await this.prisma.riskCategory.create({
            data: riskCategoryData,
          });
          console.log(
            `Created RiskCategory: id=${created.id}, name='${item.rowData.name}', slug='${item.rowData.slug}'`,
          );
          importedCount++;
        } catch (createError: any) {
          // Check if it's a unique constraint violation or duplicate
          if (
            createError?.code === 'P2002' ||
            createError?.message?.includes('Unique constraint')
          ) {
            console.warn(
              `Skipping duplicate RiskCategory for name='${item.rowData.name}', slug='${item.rowData.slug}': ${createError.message}`,
            );
            // Append-only: duplicates are skipped, not updated
          } else {
            console.error(
              `Failed to create RiskCategory for name='${item.rowData.name}', slug='${item.rowData.slug}':`,
              createError,
            );
            throw createError;
          }
        }
      }

      // Verify that records were actually created
      const actualCount = await this.prisma.riskCategory.count({
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
        message: `Risk categories uploaded successfully`,
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
      const sheetName = findTier1LossDataSheet(workbook);
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
