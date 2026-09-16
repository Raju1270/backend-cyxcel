import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ControlQuestionType,
  ControlSubPartsStyle,
  Impact,
  Likelihood,
  Prisma,
} from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { slugify } from '../../common/utils/slugify.util';
import { ControlSubPartDto } from './dto/control-sub-part.dto';
import { CreatePerilDto } from './dto/create-peril.dto';
import { PerilsQueryDto } from './dto/perils-query.dto';
import { UpdatePerilDto } from './dto/update-peril.dto';

const RISK_CATEGORY_SELECT = {
  id: true,
  slug: true,
  name: true,
} satisfies Prisma.RiskCategorySelect;

const NATURE_OF_LOSS_SELECT = {
  id: true,
  slug: true,
  name: true,
} satisfies Prisma.NatureOfLossSelect;

const SECTOR_SELECT = {
  id: true,
  name: true,
  role: true,
} satisfies Prisma.SectorSelect;

const CONTROL_SELECT = {
  id: true,
  question: true,
  source: true,
  type: true,
  introText: true,
  subParts: true,
  subPartsStyle: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ControlSelect;

const PERIL_INCLUDE = {
  riskCategories: {
    select: RISK_CATEGORY_SELECT,
  },
  natureOfLosses: {
    select: NATURE_OF_LOSS_SELECT,
  },
  sectors: {
    select: SECTOR_SELECT,
  },
  control: {
    select: CONTROL_SELECT,
  },
} satisfies Prisma.PerilInclude;

// Prisma's default interactive-transaction timeout (5000ms) is too tight for
// remote/pooled DB connections where each round-trip in the transaction adds
// meaningful latency.
const TRANSACTION_OPTIONS = {
  timeout: 15000,
  maxWait: 10000,
};

// SEVERITY (impact) IS NOW PART OF THE SAME DATED PerilLikelihood ROW AS
// EU/US/UK, NOT A SEPARATE ALWAYS-INDEPENDENT FIELD - SO ALL FOUR MUST BE
// PROVIDED TOGETHER, EXACTLY LIKE EU/US/UK ALREADY HAD TO BE.
interface RatingQuad {
  impact?: Impact;
  euLikelihood?: Likelihood;
  usLikelihood?: Likelihood;
  ukLikelihood?: Likelihood;
}

interface ControlInput {
  controlQuestion?: string;
  controlSource?: string;
  controlType?: ControlQuestionType;
  controlIntroText?: string;
  controlSubParts?: ControlSubPartDto[];
  controlSubPartsStyle?: ControlSubPartsStyle;
}

interface ValidatedControl {
  question: string;
  source: string;
  type: ControlQuestionType;
  introText: string | null;
  subParts: ControlSubPartDto[] | null;
  subPartsStyle: ControlSubPartsStyle;
}

interface LikelihoodSummary {
  impact: Impact;
  eu: Likelihood;
  us: Likelihood;
  uk: Likelihood;
  createdAt: Date;
  updatedAt: Date;
}

function withLikelihood<T extends { id: string }>(
  peril: T,
  likelihoodByPerilId: Map<string, LikelihoodSummary>,
): T & { likelihood: LikelihoodSummary | null } {
  return {
    ...peril,
    likelihood: likelihoodByPerilId.get(peril.id) ?? null,
  };
}

// SAME "2ND OF THE MONTH, UTC" CONVENTION THE PERIL-LIKELIHOOD EXCEL IMPORT USES
// (`new Date(\`${year}-${month}-02\`)`, WHICH THE JS SPEC PARSES AS UTC MIDNIGHT).
// USING THE SAME DATE HERE MEANS A MANUAL EDIT AND THAT MONTH'S EXCEL IMPORT
// LAND ON THE SAME PerilLikelihood ROW INSTEAD OF EACH CREATING THEIR OWN.
function getCurrentMonthSnapshotDate(): Date {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return new Date(`${year}-${month}-02`);
}

// SAME "2ND OF THE MONTH" CONVENTION, FOR AN EXPLICIT ratingMonth (YYYY-MM)
// INSTEAD OF "NOW" - LETS update() TARGET A SPECIFIC PAST MONTH'S ROW.
function parseRatingMonth(ratingMonth: string): Date {
  return new Date(`${ratingMonth}-02`);
}

@Injectable()
export class PerilsService {
  private readonly logger = new Logger(PerilsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: PerilsQueryDto,
  ): Promise<{ data: any[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PerilWhereInput = {};

    if (!query.includeDeleted) {
      where.deletedAt = null;
    }

    if (query.riskCategoryId) {
      where.riskCategories = {
        some: { id: query.riskCategoryId },
      };
    }

    if (query.sectorId) {
      where.sectors = {
        some: { id: query.sectorId },
      };
    }

    if (query.natureOfLossId) {
      where.natureOfLosses = {
        some: { id: query.natureOfLossId },
      };
    }

    if (query.impact) {
      where.impact = query.impact;
    }

    if (query.region) {
      where.region = { has: query.region };
    }

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const orderBy = query.orderBy ?? 'name';
    const orderDirection = query.orderDirection ?? 'DESC';

    const orderByClause: Prisma.PerilOrderByWithRelationInput = {
      [orderBy]: orderDirection.toLowerCase(),
    };

    const [data, total] = await Promise.all([
      this.prisma.peril.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: PERIL_INCLUDE,
      }),
      this.prisma.peril.count({ where }),
    ]);

    const likelihoodByPerilId = await this.getLatestLikelihoodMap(
      data.map((peril) => peril.id),
    );

    const pageCount = Math.ceil(total / limit);

    return {
      data: data.map((peril) => withLikelihood(peril, likelihoodByPerilId)),
      meta: {
        total,
        page,
        limit,
        pageCount,
      },
    };
  }

  async findOne(id: string): Promise<any> {
    const record = await this.prisma.peril.findFirst({
      where: { id, deletedAt: null },
      include: PERIL_INCLUDE,
    });

    if (!record) {
      throw new NotFoundException(`Peril with ID ${id} not found`);
    }

    const likelihoodByPerilId = await this.getLatestLikelihoodMap([record.id]);

    return withLikelihood(record, likelihoodByPerilId);
  }

  /**
   * Returns the most recent PerilLikelihood row per perilId, mirroring how
   * the peril-likelihood Excel import treats each import as a dated snapshot.
   */
  private async getLatestLikelihoodMap(
    perilIds: string[],
  ): Promise<Map<string, LikelihoodSummary>> {
    if (perilIds.length === 0) {
      return new Map();
    }

    const latest = await this.prisma.perilLikelihood.findMany({
      where: { perilId: { in: perilIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['perilId'],
      select: {
        perilId: true,
        impact: true,
        eu: true,
        us: true,
        uk: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return new Map(
      latest.map((row) => [
        row.perilId,
        {
          impact: row.impact,
          eu: row.eu,
          us: row.us,
          uk: row.uk,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      ]),
    );
  }

  private validateRatingQuad(
    dto: RatingQuad,
  ): [Impact, Likelihood, Likelihood, Likelihood] | null {
    const { impact, euLikelihood, usLikelihood, ukLikelihood } = dto;
    const providedCount = [
      impact,
      euLikelihood,
      usLikelihood,
      ukLikelihood,
    ].filter((v) => v !== undefined).length;

    if (providedCount === 0) {
      return null;
    }

    if (
      providedCount !== 4 ||
      !impact ||
      !euLikelihood ||
      !usLikelihood ||
      !ukLikelihood
    ) {
      throw new BadRequestException(
        'impact, euLikelihood, usLikelihood, and ukLikelihood must all be provided together',
      );
    }

    return [impact, euLikelihood, usLikelihood, ukLikelihood];
  }

  private validateControl(dto: ControlInput): ValidatedControl | null {
    const {
      controlQuestion,
      controlSource,
      controlType,
      controlIntroText,
      controlSubParts,
      controlSubPartsStyle,
    } = dto;
    const providedCount = [controlQuestion, controlSource].filter(
      (v) => v !== undefined,
    ).length;

    if (providedCount === 0) {
      return null;
    }

    if (providedCount !== 2 || !controlQuestion || !controlSource) {
      throw new BadRequestException(
        'controlQuestion and controlSource must both be provided together',
      );
    }

    const type = controlType ?? ControlQuestionType.SINGLE_LINE;
    const isSection = type === ControlQuestionType.SECTION_WITH_SUBPARTS;

    if (isSection) {
      if (!controlSubParts || controlSubParts.length === 0) {
        throw new BadRequestException(
          'controlSubParts must contain at least one sub-part when controlType is SECTION_WITH_SUBPARTS',
        );
      }
      for (const subPart of controlSubParts) {
        if (!subPart.key?.trim() || !subPart.text?.trim()) {
          throw new BadRequestException(
            'Each controlSubParts entry needs a non-empty key and non-empty text',
          );
        }
      }
    }

    return {
      question: controlQuestion,
      source: controlSource,
      type,
      // ONLY MEANINGFUL FOR SECTION_WITH_SUBPARTS - DROPPED RATHER THAN STORED
      // STALE IF A CONTROL IS EVER SWITCHED BACK TO SINGLE_LINE.
      introText: isSection ? (controlIntroText ?? null) : null,
      subParts: isSection ? controlSubParts! : null,
      subPartsStyle: controlSubPartsStyle ?? ControlSubPartsStyle.LETTERED,
    };
  }

  private async generateUniqueSlug(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 1;

    for (;;) {
      const existing = await this.prisma.peril.findFirst({
        where: {
          slug,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });

      if (!existing) {
        return slug;
      }

      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }
  }

  async create(dto: CreatePerilDto): Promise<any> {
    const slug = await this.generateUniqueSlug(dto.name);
    const quad = this.validateRatingQuad(dto);
    const control = this.validateControl(dto);

    const created = await this.prisma.$transaction(async (tx) => {
      const peril = await tx.peril.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          impact: dto.impact,
          region: dto.region ?? [],
          ...(dto.riskCategoryIds
            ? {
                riskCategories: {
                  connect: dto.riskCategoryIds.map((id) => ({ id })),
                },
              }
            : {}),
          ...(dto.natureOfLossIds
            ? {
                natureOfLosses: {
                  connect: dto.natureOfLossIds.map((id) => ({ id })),
                },
              }
            : {}),
          ...(dto.sectorIds
            ? {
                sectors: {
                  connect: dto.sectorIds.map((id) => ({ id })),
                },
              }
            : {}),
          ...(control
            ? {
                control: {
                  create: {
                    question: control.question,
                    source: control.source,
                    type: control.type,
                    introText: control.introText,
                    subParts: (control.subParts as unknown as Prisma.InputJsonValue[] | undefined) ?? Prisma.DbNull,
                    subPartsStyle: control.subPartsStyle,
                  },
                },
              }
            : {}),
        },
        include: PERIL_INCLUDE,
      });

      if (quad) {
        const [impact, eu, us, uk] = quad;
        // MUST MATCH THE SAME "2ND OF THE MONTH" CANONICAL DATE update() LOOKS
        // UP BY perilId_createdAt - WITHOUT THIS, PRISMA'S DEFAULT now() STAMPS
        // THE EXACT CREATION INSTANT, SO EDITING THIS PERIL'S RATING AGAIN
        // LATER THE *SAME* MONTH NEVER MATCHES THAT ROW AND SILENTLY CREATES A
        // SECOND ONE INSTEAD OF UPDATING THE FIRST.
        await tx.perilLikelihood.create({
          data: {
            perilId: peril.id,
            impact,
            eu,
            us,
            uk,
            createdAt: getCurrentMonthSnapshotDate(),
          },
        });
      }

      return peril;
    }, TRANSACTION_OPTIONS);

    this.logger.log(`Created Peril: id=${created.id}, slug=${created.slug}`);

    const likelihoodByPerilId = await this.getLatestLikelihoodMap([created.id]);

    return withLikelihood(created, likelihoodByPerilId);
  }

  async update(id: string, dto: UpdatePerilDto): Promise<any> {
    // Ensure record exists and is not soft-deleted
    const existing = await this.prisma.peril.findFirst({
      where: { id, deletedAt: null },
      select: { name: true },
    });

    if (!existing) {
      throw new NotFoundException(`Peril with ID ${id} not found`);
    }

    const slug =
      dto.name !== undefined && dto.name !== existing.name
        ? await this.generateUniqueSlug(dto.name, id)
        : undefined;

    const quad = this.validateRatingQuad(dto);
    const control = this.validateControl(dto);

    // WITHOUT THIS, ratingMonth GIVEN ALONE (E.G. A CALLER'S MISTAKE, OR A
    // FUTURE CLIENT BUG) WOULD BE SILENTLY IGNORED SINCE IT'S ONLY EVER READ
    // INSIDE THE if (quad) BLOCK BELOW - BETTER TO FAIL LOUDLY THAN LET
    // SOMEONE THINK THEY TARGETED A MONTH WHEN NOTHING ACTUALLY HAPPENED.
    if (dto.ratingMonth !== undefined && !quad) {
      throw new BadRequestException(
        'ratingMonth requires impact, euLikelihood, usLikelihood, and ukLikelihood to also be provided',
      );
    }

    let snapshotDate: Date | undefined;
    if (quad) {
      snapshotDate = dto.ratingMonth
        ? parseRatingMonth(dto.ratingMonth)
        : getCurrentMonthSnapshotDate();

      if (snapshotDate.getTime() > getCurrentMonthSnapshotDate().getTime()) {
        throw new BadRequestException('ratingMonth cannot be in the future');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // CACHED "CURRENT" SEVERITY ON Peril.impact ITSELF, DERIVED FROM
      // WHICHEVER PerilLikelihood ROW IS ACTUALLY THE LATEST BY DATE - NOT
      // BLINDLY dto.impact - SO BACKFILLING AN OLDER MONTH NEVER OVERWRITES
      // THE PERIL'S REAL CURRENT SEVERITY WITH AN OUT-OF-ORDER EDIT.
      let latestImpact: Impact | undefined;

      if (quad && snapshotDate) {
        const targetMonthLikelihood = await tx.perilLikelihood.findUnique({
          where: {
            perilId_createdAt: { perilId: id, createdAt: snapshotDate },
          },
        });

        // ONLY SNAPSHOT HISTORY ON THE FIRST WRITE OF THIS MONTH - A SECOND
        // EDIT OF THE SAME MONTH IS A CORRECTION TO THAT MONTH'S OWN VALUE,
        // NOT A NEW MONTH, SO IT SHOULD OVERWRITE RATHER THAN STACK ANOTHER
        // HISTORY ENTRY (MIRRORS THE EXCEL IMPORT'S "RE-IMPORTS SKIP" RULE).
        if (!targetMonthLikelihood) {
          // SCOPED TO STRICTLY BEFORE THE TARGET MONTH (NOT JUST "MOST RECENT
          // OVERALL") - NOW THAT ratingMonth CAN BACKFILL AN ARBITRARY PAST
          // MONTH, THE GLOBAL LATEST ROW MAY BE *AFTER* THE TARGET MONTH AND
          // WOULD OTHERWISE GET WRONGLY SNAPSHOTTED AS ITS "PREVIOUS" VALUE.
          const prevLikelihood = await tx.perilLikelihood.findFirst({
            where: { perilId: id, createdAt: { lt: snapshotDate } },
            orderBy: { createdAt: 'desc' },
          });

          // NO EARLIER RECORD EXISTS AT ALL (E.G. BACKFILLING A MONTH BEFORE
          // THIS PERIL'S FIRST-EVER RATING) - THERE IS NO REAL "PREVIOUS"
          // STATE TO SNAPSHOT, SO SKIP HISTORY RATHER THAN FABRICATE ONE FROM
          // existing.impact/now(), WHICH WOULD MISLABEL A LATER MONTH'S VALUE
          // AS IF IT WERE THE STATE BEFORE THIS (EARLIEST) MONTH.
          if (prevLikelihood) {
            await tx.perilHistory.create({
              data: {
                perilId: id,
                impact: prevLikelihood.impact,
                eu: prevLikelihood.eu,
                us: prevLikelihood.us,
                uk: prevLikelihood.uk,
                likelihoodCreatedAt: prevLikelihood.createdAt,
                likelihoodUpdatedAt: prevLikelihood.updatedAt,
              },
            });
          }
        }

        const [impact, eu, us, uk] = quad;
        await tx.perilLikelihood.upsert({
          where: {
            perilId_createdAt: { perilId: id, createdAt: snapshotDate },
          },
          create: { perilId: id, impact, eu, us, uk, createdAt: snapshotDate },
          update: { impact, eu, us, uk },
        });

        // RE-READ RATHER THAN ASSUME snapshotDate IS THE LATEST - A BACKFILLED
        // PAST MONTH MUST NOT CHANGE WHAT "CURRENT" SEVERITY MEANS IF A LATER
        // MONTH ALREADY EXISTS.
        const latestLikelihood = await tx.perilLikelihood.findFirst({
          where: { perilId: id },
          orderBy: { createdAt: 'desc' },
        });
        latestImpact = latestLikelihood?.impact;
      }

      return tx.peril.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(latestImpact !== undefined ? { impact: latestImpact } : {}),
          ...(dto.region !== undefined ? { region: dto.region } : {}),
          ...(dto.riskCategoryIds !== undefined
            ? {
                riskCategories: {
                  set: dto.riskCategoryIds.map((rcId) => ({ id: rcId })),
                },
              }
            : {}),
          ...(dto.natureOfLossIds !== undefined
            ? {
                natureOfLosses: {
                  set: dto.natureOfLossIds.map((nolId) => ({ id: nolId })),
                },
              }
            : {}),
          ...(dto.sectorIds !== undefined
            ? {
                sectors: {
                  set: dto.sectorIds.map((sectorId) => ({ id: sectorId })),
                },
              }
            : {}),
          ...(control
            ? {
                control: {
                  upsert: {
                    create: {
                      question: control.question,
                      source: control.source,
                      type: control.type,
                      introText: control.introText,
                      subParts: (control.subParts as unknown as Prisma.InputJsonValue[] | undefined) ?? Prisma.DbNull,
                      subPartsStyle: control.subPartsStyle,
                    },
                    update: {
                      question: control.question,
                      source: control.source,
                      type: control.type,
                      introText: control.introText,
                      subParts: (control.subParts as unknown as Prisma.InputJsonValue[] | undefined) ?? Prisma.DbNull,
                      subPartsStyle: control.subPartsStyle,
                    },
                  },
                },
              }
            : {}),
        },
        include: PERIL_INCLUDE,
      });
    }, TRANSACTION_OPTIONS);

    this.logger.log(`Updated Peril: id=${updated.id}, slug=${updated.slug}`);

    const likelihoodByPerilId = await this.getLatestLikelihoodMap([updated.id]);

    return withLikelihood(updated, likelihoodByPerilId);
  }

  // ALL RECORDED MONTHS FOR A PERIL, NEWEST FIRST - LETS THE ADMIN UI SHOW
  // WHICH MONTHS ALREADY HAVE A RATING AND PREFILL ONE WHEN PICKED, INSTEAD OF
  // ONLY EVER SEEING THE SINGLE LATEST SNAPSHOT (SEE getLatestLikelihoodMap).
  async getLikelihoodHistory(id: string): Promise<
    {
      createdAt: Date;
      impact: Impact;
      eu: Likelihood;
      us: Likelihood;
      uk: Likelihood;
    }[]
  > {
    const existing = await this.prisma.peril.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Peril with ID ${id} not found`);
    }

    return this.prisma.perilLikelihood.findMany({
      where: { perilId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, impact: true, eu: true, us: true, uk: true },
    });
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.prisma.peril.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });

    if (!existing) {
      throw new NotFoundException(`Peril with ID ${id} not found`);
    }

    // Idempotent: if already deleted, do nothing
    if (existing.deletedAt) {
      return;
    }

    await this.prisma.peril.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Soft-deleted Peril: id=${id}`);
  }
}

@Injectable()
export class RiskCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.riskCategory.findMany({
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}

@Injectable()
export class SectorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.sector.findMany({
      select: SECTOR_SELECT,
      orderBy: { name: 'asc' },
    });
  }
}

const RISK_OWNER_SELECT = {
  id: true,
  name: true,
} satisfies Prisma.RiskOwnerSelect;

@Injectable()
export class NatureOfLossService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.natureOfLoss.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        definition: true,
        primaryOwner: { select: RISK_OWNER_SELECT },
        secondaryOwners: { select: RISK_OWNER_SELECT },
      },
      orderBy: { name: 'asc' },
    });
  }
}
