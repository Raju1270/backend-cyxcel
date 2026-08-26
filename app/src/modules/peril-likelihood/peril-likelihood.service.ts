import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

type Tx = Prisma.TransactionClient;

const SHEET_TO_RISK_CATEGORY_SLUG: Record<string, string> = {
  'ai-governance': 'artificial-intelligence',
};

function resolveRiskCategorySlug(sheetName: string): string {
  return SHEET_TO_RISK_CATEGORY_SLUG[sheetName] ?? sheetName;
}

function isPrismaConnectionFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'PrismaClientInitializationError' ||
    /can't reach database server/i.test(error.message) ||
    /invalid `this\.prisma\./i.test(error.message)
  );
}

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
    const createdAt = new Date(`${year}-${month}-02`);

    try {
      const workbook = getWorkbookAsJsonFromBuffer(fileBuffer);
      const sheetsToProcess = filterAllowedSheets(workbook);
      const globalWarnings: string[] = [];

      const missingSheets = findMissingSheets(workbook);
      if (missingSheets.length > 0) {
        missingSheets.forEach((sheet) => {
          globalWarnings.push(`Sheet '${sheet}' not found in workbook`);
        });
      }

      const euColumn = `EU ${monthAsString.toUpperCase()} ${year}`;
      const usColumn = `US ${monthAsString.toUpperCase()} ${year}`;
      const ukColumn = `UK ${monthAsString.toUpperCase()} ${year}`;

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

      const candidateTitles = new Set<string>();
      const candidateSlugs = new Set<string>();
      const candidateNatureOfLossNames = new Set<string>();
      for (const sheetName of sheetsToProcess) {
        const rows = workbook[sheetName] as LatestPerilLikelihoodRow[];
        for (const row of rows) {
          const { title, natureOfLoss } = parsePerilRow(row);
          if (isEmptyOrHeaderRow(title)) {
            continue;
          }
          candidateTitles.add(title);
          candidateSlugs.add(slugify(title));
          natureOfLoss.forEach((n) => candidateNatureOfLossNames.add(n));
        }
      }

      const existingNatureOfLosses = candidateNatureOfLossNames.size
        ? await this.prisma.natureOfLoss.findMany({
            where: { name: { in: Array.from(candidateNatureOfLossNames) } },
            select: { id: true, name: true },
          })
        : [];
      const natureOfLossByName = new Map(
        existingNatureOfLosses.map((n) => [n.name, n]),
      );

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

      for (const sheetName of sheetsToProcess) {
        const rows = workbook[sheetName] as LatestPerilLikelihoodRow[];

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          const excelRowNumber = rowIndex + 2;

          const parsedRow = parsePerilRow(row);

          if (isEmptyOrHeaderRow(parsedRow.title)) {
            continue;
          }

          const slug = slugify(parsedRow.title);

          const existingPeril =
            perilBySlug.get(slug) ?? perilByName.get(parsedRow.title) ?? null;

          const isNewPeril = !existingPeril;

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

          const matchedNatureOfLoss: string[] = [];
          const unmatchedNatureOfLoss: string[] = [];
          for (const name of parsedRow.natureOfLoss) {
            if (natureOfLossByName.has(name)) {
              matchedNatureOfLoss.push(name);
            } else {
              unmatchedNatureOfLoss.push(name);
            }
          }

          const hasExistingMonthData =
            !!existingPeril && perilIdsWithMonthData.has(existingPeril.id);
          const warnings = [
            ...validationResult.warnings,
            ...(hasExistingMonthData
              ? [
                  `${parsedRow.title} already has data for ${monthAsString} ${year} - importing will overwrite the existing values`,
                ]
              : []),
            ...unmatchedNatureOfLoss.map(
              (name) =>
                `Nature of loss '${name}' for '${parsedRow.title}' does not match any existing record - it will be skipped`,
            ),
          ];

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
              natureOfLoss: matchedNatureOfLoss,
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
      if (isPrismaConnectionFailure(error)) {
        throw new ServiceUnavailableException(
          'Database is unavailable for peril likelihood import. Check DATABASE_URL and the Prisma database connection.',
        );
      }

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

  private async resolvePerilIdsInBatch(
    tx: Tx,
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

    const uniqueNewPerils = new Map<string, PerilLikelihoodPreviewItem>();
    for (const item of newPerilItems) {
      uniqueNewPerils.set(item.rowData.perilSlug, item);
    }

    const sheetSlugs = Array.from(
      new Set(
        newPerilItems.map((item) =>
          resolveRiskCategorySlug(item._data.sheetName),
        ),
      ),
    );
    const riskCategories = await tx.riskCategory.findMany({
      where: { slug: { in: sheetSlugs } },
      select: { id: true, slug: true },
    });
    const riskCategoryBySlug = new Map(
      riskCategories.map((rc) => [rc.slug, rc]),
    );

    await tx.peril.createMany({
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

    const createdPerils = await tx.peril.findMany({
      where: { slug: { in: Array.from(uniqueNewPerils.keys()) } },
      select: { id: true, slug: true },
    });
    const perilIdBySlug = new Map(createdPerils.map((p) => [p.slug, p.id]));

    const perilIdsBySheet = new Map<string, string[]>();
    for (const [slug, item] of uniqueNewPerils.entries()) {
      const perilId = perilIdBySlug.get(slug);
      if (!perilId) {
        continue;
      }
      const list = perilIdsBySheet.get(item._data.sheetName) ?? [];
      list.push(perilId);
      perilIdsBySheet.set(item._data.sheetName, list);
    }
    for (const [sheetName, perilIds] of perilIdsBySheet.entries()) {
      const riskCategory = riskCategoryBySlug.get(
        resolveRiskCategorySlug(sheetName),
      );
      if (!riskCategory) {
        continue;
      }
      await tx.riskCategory.update({
        where: { id: riskCategory.id },
        data: { perils: { connect: perilIds.map((id) => ({ id })) } },
      });
    }

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
      const preview = await this.validateAndPreview(fileBuffer, month, year);
      const createdAt = new Date(`${year}-${month}-02`);

      const allowedStatusesSet = new Set(allowedStatuses);
      if (allowedStatusesSet.has(PreviewStatus.DUPLICATE)) {
        throw new BadRequestException(
          'DUPLICATE status is not allowed for import. Items with DUPLICATE status will never be imported.',
        );
      }

      const itemsToImport = preview.data.filter((item) => {
        const allowed = allowedStatusesSet.has(item._data.status);
        if (!allowed) {
          console.warn(
            `${preview.monthAsString} likelihoods: skipping item with status '${item._data.status}' - perilId=${item.rowData.perilId}, perilName='${item.rowData.perilName}'`,
          );
        }
        return allowed;
      });

      let importedCount = 0;
      let duplicateRowsMerged = 0;
      let toUpdateCount = 0;

      await this.prisma.$transaction(
        async (tx) => {
          const perilIdByItem = await this.resolvePerilIdsInBatch(
            tx,
            itemsToImport,
            createdAt,
          );

          const namesInImport = new Set<string>();
          for (const item of itemsToImport) {
            item.rowData.natureOfLoss.forEach((n) => namesInImport.add(n));
          }
          if (namesInImport.size) {
            const natureOfLosses = await tx.natureOfLoss.findMany({
              where: { name: { in: Array.from(namesInImport) } },
              select: { id: true, name: true },
            });
            const natureOfLossIdByName = new Map(
              natureOfLosses.map((n) => [n.name, n.id]),
            );

            const perilIdsByNatureOfLossId = new Map<string, Set<string>>();
            for (const item of itemsToImport) {
              const perilId = perilIdByItem.get(item);
              if (!perilId) {
                continue;
              }
              for (const name of item.rowData.natureOfLoss) {
                const natureOfLossId = natureOfLossIdByName.get(name);
                if (!natureOfLossId) {
                  continue;
                }
                const set =
                  perilIdsByNatureOfLossId.get(natureOfLossId) ?? new Set();
                set.add(perilId);
                perilIdsByNatureOfLossId.set(natureOfLossId, set);
              }
            }

            for (const [
              natureOfLossId,
              perilIds,
            ] of perilIdsByNatureOfLossId.entries()) {
              await tx.natureOfLoss.update({
                where: { id: natureOfLossId },
                data: {
                  perils: {
                    connect: Array.from(perilIds).map((id) => ({ id })),
                  },
                },
              });
            }
          }

          const latestByPerilId = new Map<
            string,
            { item: PerilLikelihoodPreviewItem; perilId: string }
          >();
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

          const existingCurrentMonthLikelihoods = perilIds.length
            ? await tx.perilLikelihood.findMany({
                where: {
                  perilId: { in: perilIds },
                  createdAt,
                },
              })
            : [];

          const existingCurrentMonthByPerilId = new Map(
            existingCurrentMonthLikelihoods.map((likelihood) => [
              likelihood.perilId,
              likelihood,
            ]),
          );

          const previousLikelihoods = perilIds.length
            ? await tx.perilLikelihood.findMany({
                where: {
                  perilId: { in: perilIds },
                  createdAt: {
                    lt: createdAt,
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
              })
            : [];

          const previousLikelihoodByPerilId = new Map<
            string,
            (typeof previousLikelihoods)[number]
          >();

          for (const likelihood of previousLikelihoods) {
            if (!previousLikelihoodByPerilId.has(likelihood.perilId)) {
              previousLikelihoodByPerilId.set(likelihood.perilId, likelihood);
            }
          }

          const existingPerils = perilIds.length
            ? await tx.peril.findMany({
                where: {
                  id: { in: perilIds },
                },
                select: {
                  id: true,
                  impact: true,
                },
              })
            : [];

          const impactByPerilId = new Map<
            string,
            (typeof existingPerils)[number]['impact']
          >(existingPerils.map((peril) => [peril.id, peril.impact]));

          // HISTORY ONLY ON FIRST IMPORT OF THE MONTH FOR A PERIL - RE-IMPORTS SKIP TO AVOID DUPLICATE SNAPSHOTS.
          const historyData = entries
            .filter(({ perilId }) => {
              return (
                previousLikelihoodByPerilId.has(perilId) &&
                !existingCurrentMonthByPerilId.has(perilId)
              );
            })
            .map(({ perilId }) => {
              const previousLikelihood =
                previousLikelihoodByPerilId.get(perilId);

              return {
                perilId,
                impact: impactByPerilId.get(perilId) ?? null,
                eu: previousLikelihood?.eu ?? null,
                us: previousLikelihood?.us ?? null,
                uk: previousLikelihood?.uk ?? null,
                updatedById: userId,
                likelihoodCreatedAt: previousLikelihood?.createdAt,
                likelihoodUpdatedAt: previousLikelihood?.updatedAt,
              };
            });

          if (historyData.length > 0) {
            await tx.perilHistory.createMany({
              data: historyData,
            });
          }

          for (const { item, perilId } of entries) {
            const oldImpact = impactByPerilId.get(perilId);

            if (
              item.rowData.impact !== undefined &&
              item.rowData.impact !== oldImpact
            ) {
              await tx.peril.update({
                where: {
                  id: perilId,
                },
                data: {
                  impact: item.rowData.impact,
                  description: item.rowData.description ?? undefined,
                },
              });
            }
          }

          const toCreateEntries = entries.filter(
            ({ perilId }) => !existingCurrentMonthByPerilId.has(perilId),
          );

          const toUpdateEntries = entries.filter(({ perilId }) =>
            existingCurrentMonthByPerilId.has(perilId),
          );

          toUpdateCount = toUpdateEntries.length;

          if (toCreateEntries.length) {
            await tx.perilLikelihood.createMany({
              data: toCreateEntries.map(({ item, perilId }) => ({
                perilId,
                eu: item.rowData.eu,
                us: item.rowData.us,
                uk: item.rowData.uk,
                createdAt,
              })),
              skipDuplicates: true,
            });
          }

          for (const { item, perilId } of toUpdateEntries) {
            await tx.perilLikelihood.update({
              where: {
                perilId_createdAt: {
                  perilId,
                  createdAt,
                },
              },
              data: {
                eu: item.rowData.eu,
                us: item.rowData.us,
                uk: item.rowData.uk,
              },
            });
          }

          importedCount = entries.length;
        },
        { timeout: 60_000 },
      );

      console.log(
        `${preview.monthAsString} likelihoods: batch-wrote ${importedCount - toUpdateCount} new and ${toUpdateCount} updated PerilLikelihood record(s)`,
      );

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
      if (userId && filename) {
        await this.importLogService.createFailedLog(userId, filename, 0);
      }

      if (isPrismaConnectionFailure(error)) {
        throw new ServiceUnavailableException(
          'Database is unavailable for peril likelihood import. Check DATABASE_URL and the Prisma database connection.',
        );
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
    const preview = await this.validateAndPreview(fileBuffer, month, year);

    return downloadExcelWithHighlights(
      fileBuffer,
      preview.data,
      preview.invalidItemsDetails,
    );
  }
}
