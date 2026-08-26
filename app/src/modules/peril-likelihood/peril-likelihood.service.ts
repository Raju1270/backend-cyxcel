import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportLogService } from '../import-log/import-log.service';
import { PreviewStatus } from '../../common/utils/preview-status.enum';
import { InvalidItemDto } from '../../common/dto/import-common.dto';
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
import { validatePerilRow } from './validators/peril-row.validator';
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
    // dated 02 of the month to account for timezone differences
    const createdAt = new Date(`${year}-${month}-02`);

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
      const invalidItemsDetails: InvalidItemDto[] = [];
      const invalidItems = 0;

      // Collect every candidate title/slug up front so existing perils can be
      // fetched in a single batched query instead of 1-2 queries per row.
      // With an empty (or mostly empty) Peril table, the per-row lookups used
      // to double up (slug miss -> name lookup) on every single row, which was
      // slow enough to time out the request entirely.
      const candidateTitles = new Set<string>();
      const candidateSlugs = new Set<string>();
      for (const sheetName of sheetsToProcess) {
        const rows = workbook[sheetName] as LatestPerilLikelihoodRow[];
        for (const row of rows) {
          const { title } = parsePerilRow(row);
          if (isEmptyOrHeaderRow(title)) {
            continue;
          }
          candidateTitles.add(title);
          candidateSlugs.add(slugify(title));
        }
      }

      const existingPerils = candidateTitles.size
        ? await this.prisma.peril.findMany({
            where: {
              OR: [
                { slug: { in: Array.from(candidateSlugs) } },
                { name: { in: Array.from(candidateTitles) } },
              ],
            },
          })
        : [];

      const perilBySlug = new Map(existingPerils.map((p) => [p.slug, p]));
      const perilByName = new Map(existingPerils.map((p) => [p.name, p]));

      // Perils that already have a record for the target month - importing
      // these will overwrite existing values, so flag it for visibility
      // without blocking the import (re-imports/corrections should keep
      // working by default).
      const existingPerilIds = existingPerils.map((p) => p.id);
      const monthlyLikelihoods = existingPerilIds.length
        ? await this.prisma.perilLikelihood.findMany({
            where: { perilId: { in: existingPerilIds }, createdAt },
            select: { perilId: true },
          })
        : [];
      const perilIdsWithMonthData = new Set(
        monthlyLikelihoods.map((l) => l.perilId),
      );

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
            perilBySlug.get(slug) ?? perilByName.get(parsedRow.title) ?? null;

          const isNewPeril = !existingPeril;

          // Validate row - peril may be null; a new peril is created on import
          const validationResult = validatePerilRow(
            row,
            existingPeril,
            euColumn,
            usColumn,
            ukColumn,
            sheetName,
            excelRowNumber,
          );

          const status =
            validationResult.warnings.length > 0
              ? PreviewStatus.NEED_REVIEW
              : PreviewStatus.READY;

          const hasExistingMonthData =
            !!existingPeril && perilIdsWithMonthData.has(existingPeril.id);
          const warnings = hasExistingMonthData
            ? [
                ...validationResult.warnings,
                `${parsedRow.title} already has data for ${monthAsString} ${year} - importing will overwrite the existing values`,
              ]
            : validationResult.warnings;

          previewItems.push({
            rowData: {
              perilId: existingPeril?.id ?? null,
              perilName: parsedRow.title,
              perilSlug: slug,
              eu: validationResult.eu,
              us: validationResult.us,
              uk: validationResult.uk,
              isNewPeril,
              hasExistingMonthData,
              description: validationResult.description,
              impact: validationResult.impact ?? null,
            },
            _data: {
              row: excelRowNumber,
              sheetName,
              warnings,
              status,
            },
          });
        }
      }

      // The same peril can appear on more than one row/sheet within a single
      // workbook (e.g. listed under both 'cyber' and 'technology-itot') -
      // only one PerilLikelihood record exists per peril per month, so
      // duplicates collapse into a single write (last row wins) on import.
      // Surface that here so the row count in this preview isn't mistaken
      // for the number of records that will actually land in the DB.
      const firstSeenByPerilIdentity = new Map<
        string,
        PerilLikelihoodPreviewItem
      >();
      for (const item of previewItems) {
        const identity =
          item.rowData.perilId ?? `new:${item.rowData.perilSlug}`;
        const firstSeen = firstSeenByPerilIdentity.get(identity);
        if (firstSeen) {
          globalWarnings.push(
            `'${item.rowData.perilName}' appears in both sheet '${firstSeen._data.sheetName}' and sheet '${item._data.sheetName}' - only one PerilLikelihood record exists per peril per month, so the row from sheet '${item._data.sheetName}' will overwrite the other on import`,
          );
        } else {
          firstSeenByPerilIdentity.set(identity, item);
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

  /**
   * Resolves peril ids for a batch of preview items in a handful of queries
   * total (rather than one round trip per row), creating any perils that
   * don't exist yet. New perils are linked to the risk category matching the
   * sheet they were found in (sheet names are risk category slugs), and are
   * dated to the import's target month rather than today - otherwise a
   * backdated import (e.g. uploading last year's data) would make brand new
   * perils look like they were created today.
   */
  private async resolvePerilIdsInBatch(
    items: PerilLikelihoodPreviewItem[],
    createdAt: Date,
  ): Promise<Map<PerilLikelihoodPreviewItem, string>> {
    const perilIdByItem = new Map<PerilLikelihoodPreviewItem, string>();
    const newPerilItems: PerilLikelihoodPreviewItem[] = [];

    for (const item of items) {
      if (item.rowData.perilId) {
        perilIdByItem.set(item, item.rowData.perilId);
      } else {
        newPerilItems.push(item);
      }
    }

    if (newPerilItems.length === 0) {
      return perilIdByItem;
    }

    // The same new peril can appear on more than one sheet - dedupe by slug
    // so it's only created once.
    const uniqueNewPerils = new Map<string, PerilLikelihoodPreviewItem>();
    for (const item of newPerilItems) {
      uniqueNewPerils.set(item.rowData.perilSlug, item);
    }

    const sheetSlugs = Array.from(
      new Set(newPerilItems.map((item) => item._data.sheetName)),
    );
    const riskCategories = await this.prisma.riskCategory.findMany({
      where: { slug: { in: sheetSlugs } },
      select: { id: true, slug: true },
    });
    const riskCategoryBySlug = new Map(
      riskCategories.map((rc) => [rc.slug, rc]),
    );

    await this.prisma.peril.createMany({
      data: Array.from(uniqueNewPerils.values()).map((item) => ({
        name: item.rowData.perilName,
        slug: item.rowData.perilSlug,
        description: item.rowData.description || '',
        impact: item.rowData.impact ?? undefined,
        region: [],
        createdAt,
      })),
      skipDuplicates: true,
    });

    const createdPerils = await this.prisma.peril.findMany({
      where: { slug: { in: Array.from(uniqueNewPerils.keys()) } },
      select: { id: true, slug: true },
    });
    const perilIdBySlug = new Map(createdPerils.map((p) => [p.slug, p.id]));

    // Connect each newly-resolved peril to its sheet's risk category - bounded
    // by the number of distinct new perils, not the number of rows.
    await Promise.all(
      Array.from(uniqueNewPerils.entries()).map(([slug, item]) => {
        const riskCategory = riskCategoryBySlug.get(item._data.sheetName);
        const perilId = perilIdBySlug.get(slug);
        if (!riskCategory || !perilId) {
          return Promise.resolve();
        }
        return this.prisma.peril.update({
          where: { id: perilId },
          data: { riskCategories: { connect: { id: riskCategory.id } } },
        });
      }),
    );

    for (const item of newPerilItems) {
      const perilId = perilIdBySlug.get(item.rowData.perilSlug);
      if (perilId) {
        perilIdByItem.set(item, perilId);
      } else {
        console.error(
          `Failed to resolve peril id for new peril '${item.rowData.perilName}' (slug='${item.rowData.perilSlug}')`,
        );
      }
    }

    return perilIdByItem;
  }

  async importData(
    fileBuffer: Buffer,
    month: string,
    year: string,
    allowedStatuses: PreviewStatus[] = [PreviewStatus.READY],
    userId?: string,
    filename?: string,
  ): Promise<{
    message: string;
    imported: number;
    actualImported: number;
    duplicateRowsMerged?: number;
  }> {
    try {
      // Validate and get preview data first
      const preview = await this.validateAndPreview(fileBuffer, month, year);

      // dated 02 of the month to account for timezone differences
      const createdAt = new Date(`${year}-${month}-02`);

      // Never import items with DUPLICATE status
      const allowedStatusesSet = new Set(allowedStatuses);
      if (allowedStatusesSet.has(PreviewStatus.DUPLICATE)) {
        throw new BadRequestException(
          'DUPLICATE status is not allowed for import. Items with DUPLICATE status will never be imported.',
        );
      }

      // Only import items with allowed statuses
      const itemsToImport = preview.data.filter((item) => {
        const allowed = allowedStatusesSet.has(item._data.status);
        if (!allowed) {
          console.warn(
            `${preview.monthAsString} likelihoods: skipping item with status '${item._data.status}' - perilId=${item.rowData.perilId}, perilName='${item.rowData.perilName}'`,
          );
        }
        return allowed;
      });

      const perilIdByItem = await this.resolvePerilIdsInBatch(
        itemsToImport,
        createdAt,
      );

      // The same peril can appear more than once in one import (e.g. across
      // sheets) - the last row for a given peril wins, matching what
      // sequential row-by-row writes used to produce. This is why the
      // imported count can come out lower than the row count in the
      // uploaded file: it's expected when validate/preview reported the
      // same peril's duplicate rows too (see the matching warning there).
      const latestByPerilId = new Map<
        string,
        { item: PerilLikelihoodPreviewItem; perilId: string }
      >();
      let duplicateRowsMerged = 0;
      for (const item of itemsToImport) {
        const perilId = perilIdByItem.get(item);
        if (!perilId) {
          continue;
        }
        const prior = latestByPerilId.get(perilId);
        if (prior) {
          duplicateRowsMerged++;
          console.warn(
            `${preview.monthAsString} likelihoods: peril '${item.rowData.perilName}' appears in both sheet '${prior.item._data.sheetName}' and sheet '${item._data.sheetName}' - only one PerilLikelihood record exists per peril per month, so the row from sheet '${item._data.sheetName}' overwrites the earlier one`,
          );
        }
        latestByPerilId.set(perilId, { item, perilId });
      }
      const entries = Array.from(latestByPerilId.values());
      const perilIds = entries.map((entry) => entry.perilId);

      const existingLikelihoods = perilIds.length
        ? await this.prisma.perilLikelihood.findMany({
            where: { perilId: { in: perilIds }, createdAt },
          })
        : [];
      const existingByPerilId = new Map(
        existingLikelihoods.map((likelihood) => [
          likelihood.perilId,
          likelihood,
        ]),
      );

      const toUpdate = entries.filter((entry) =>
        existingByPerilId.has(entry.perilId),
      );

      // Only overwriting an existing month's numbers can lose data, so only
      // that case needs a history snapshot - and it must snapshot that same
      // month's prior values (not just "whatever is newest"), otherwise
      // backdated imports would record a later month's numbers as if they
      // preceded this one.
      const perilImpacts = toUpdate.length
        ? await this.prisma.peril.findMany({
            where: { id: { in: toUpdate.map((entry) => entry.perilId) } },
            select: { id: true, impact: true },
          })
        : [];
      const impactByPerilId = new Map(
        perilImpacts.map((peril) => [peril.id, peril.impact]),
      );

      const historyData = toUpdate.map(({ perilId }) => {
        const existing = existingByPerilId.get(perilId);
        return {
          perilId,
          impact: impactByPerilId.get(perilId) ?? null,
          eu: existing?.eu,
          us: existing?.us,
          uk: existing?.uk,
          updatedById: userId,
          likelihoodCreatedAt: existing?.createdAt,
          likelihoodUpdatedAt: existing?.updatedAt,
        };
      });

      // Upsert on the (perilId, createdAt) unique constraint rather than
      // branching on the findMany result above: that lookup is only used to
      // build the history snapshot. The actual write always goes through the
      // DB's own unique constraint, so even if the lookup above ever misses
      // an existing row for any reason, this still updates it in place
      // instead of silently inserting a duplicate row for the same
      // peril+month.
      await this.prisma.$transaction([
        ...(historyData.length
          ? [this.prisma.perilHistory.createMany({ data: historyData })]
          : []),
        ...entries.map(({ item, perilId }) =>
          this.prisma.perilLikelihood.upsert({
            where: { perilId_createdAt: { perilId, createdAt } },
            update: {
              eu: item.rowData.eu,
              us: item.rowData.us,
              uk: item.rowData.uk,
            },
            create: {
              perilId,
              eu: item.rowData.eu,
              us: item.rowData.us,
              uk: item.rowData.uk,
              createdAt,
            },
          }),
        ),
      ]);

      const importedCount = entries.length;

      console.log(
        `${preview.monthAsString} likelihoods: batch-wrote ${entries.length - toUpdate.length} new and ${toUpdate.length} updated PerilLikelihood record(s)`,
      );

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
        ...(duplicateRowsMerged > 0 ? { duplicateRowsMerged } : {}),
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
