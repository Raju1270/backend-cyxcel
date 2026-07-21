import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Likelihood, Prisma } from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { slugify } from '../../common/utils/slugify.util';
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

const PERIL_INCLUDE = {
  riskCategories: {
    select: RISK_CATEGORY_SELECT,
  },
  natureOfLosses: {
    select: NATURE_OF_LOSS_SELECT,
  },
} satisfies Prisma.PerilInclude;

// Prisma's default interactive-transaction timeout (5000ms) is too tight for
// remote/pooled DB connections where each round-trip in the transaction adds
// meaningful latency.
const TRANSACTION_OPTIONS = {
  timeout: 15000,
  maxWait: 10000,
};

interface LikelihoodTriad {
  euLikelihood?: Likelihood;
  usLikelihood?: Likelihood;
  ukLikelihood?: Likelihood;
}

interface LikelihoodSummary {
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
          eu: row.eu,
          us: row.us,
          uk: row.uk,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      ]),
    );
  }

  private validateLikelihoodTriad(
    dto: LikelihoodTriad,
  ): [Likelihood, Likelihood, Likelihood] | null {
    const { euLikelihood, usLikelihood, ukLikelihood } = dto;
    const providedCount = [euLikelihood, usLikelihood, ukLikelihood].filter(
      (v) => v !== undefined,
    ).length;

    if (providedCount === 0) {
      return null;
    }

    if (
      providedCount !== 3 ||
      !euLikelihood ||
      !usLikelihood ||
      !ukLikelihood
    ) {
      throw new BadRequestException(
        'euLikelihood, usLikelihood, and ukLikelihood must all be provided together',
      );
    }

    return [euLikelihood, usLikelihood, ukLikelihood];
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
    const triad = this.validateLikelihoodTriad(dto);

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
        },
        include: PERIL_INCLUDE,
      });

      if (triad) {
        const [eu, us, uk] = triad;
        await tx.perilLikelihood.create({
          data: { perilId: peril.id, eu, us, uk },
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
      select: { name: true, impact: true },
    });

    if (!existing) {
      throw new NotFoundException(`Peril with ID ${id} not found`);
    }

    const slug =
      dto.name !== undefined && dto.name !== existing.name
        ? await this.generateUniqueSlug(dto.name, id)
        : undefined;

    const triad = this.validateLikelihoodTriad(dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (triad) {
        const prevLikelihood = await tx.perilLikelihood.findFirst({
          where: { perilId: id },
          orderBy: { createdAt: 'desc' },
        });

        // Snapshot the pre-update state to history, mirroring the
        // peril-likelihood Excel import's behavior on each new data point.
        await tx.perilHistory.create({
          data: {
            perilId: id,
            impact: existing.impact,
            eu: prevLikelihood?.eu ?? null,
            us: prevLikelihood?.us ?? null,
            uk: prevLikelihood?.uk ?? null,
            likelihoodCreatedAt: prevLikelihood?.createdAt ?? new Date(),
            likelihoodUpdatedAt: prevLikelihood?.updatedAt ?? new Date(),
          },
        });

        const [eu, us, uk] = triad;
        await tx.perilLikelihood.create({
          data: { perilId: id, eu, us, uk },
        });
      }

      return tx.peril.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.impact !== undefined ? { impact: dto.impact } : {}),
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
        },
        include: PERIL_INCLUDE,
      });
    }, TRANSACTION_OPTIONS);

    this.logger.log(`Updated Peril: id=${updated.id}, slug=${updated.slug}`);

    const likelihoodByPerilId = await this.getLatestLikelihoodMap([updated.id]);

    return withLikelihood(updated, likelihoodByPerilId);
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
