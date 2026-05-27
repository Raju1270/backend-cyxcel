import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';
import { ThoughtLeadershipQueryDto } from './dto/thought-leadership-query.dto';
import { CreateThoughtLeadershipDto } from './dto/create-thought-leadership.dto';
import { UpdateThoughtLeadershipDto } from './dto/update-thought-leadership.dto';

@Injectable()
export class ThoughtLeadershipService {
  private readonly logger = new Logger(ThoughtLeadershipService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ThoughtLeadershipQueryDto,
  ): Promise<{ data: any[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ThoughtLeadershipWhereInput = {};
    const whereWithSoftDelete = where as Prisma.ThoughtLeadershipWhereInput & {
      deletedAt?: Date | string | null;
    };

    if (!query.includeDeleted) {
      whereWithSoftDelete.deletedAt = null;
    }

    if (query.riskCategoryId) {
      where.riskCategoryId = query.riskCategoryId;
    }

    if (query.q) {
      where.title = {
        contains: query.q,
        mode: 'insensitive',
      };
    }

    if (query.publishedFrom || query.publishedTo) {
      where.publishedDate = {
        ...(query.publishedFrom ? { gte: new Date(query.publishedFrom) } : {}),
        ...(query.publishedTo ? { lte: new Date(query.publishedTo) } : {}),
      };
    }

    const orderBy = query.orderBy ?? 'publishedDate';
    const orderDirection = query.orderDirection ?? 'DESC';

    const orderByClause: Prisma.ThoughtLeadershipOrderByWithRelationInput = {
      [orderBy]: orderDirection.toLowerCase(),
    };

    const [data, total] = await Promise.all([
      this.prisma.thoughtLeadership.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: {
          riskCategory: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.thoughtLeadership.count({ where }),
    ]);

    const pageCount = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pageCount,
      },
    };
  }

  async findOne(id: string): Promise<any> {
    const where = {
      id,
      deletedAt: null,
    } as Prisma.ThoughtLeadershipWhereInput;

    const record = await this.prisma.thoughtLeadership.findFirst({
      where,
      include: {
        riskCategory: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`ThoughtLeadership with ID ${id} not found`);
    }

    return record;
  }

  async create(dto: CreateThoughtLeadershipDto): Promise<any> {
    const created = await this.prisma.thoughtLeadership.create({
      data: {
        title: dto.title,
        link: dto.link,
        riskCategoryId: dto.riskCategoryId,
        publishedDate: new Date(dto.publishedDate),
      },
      include: {
        riskCategory: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Created ThoughtLeadership: id=${created.id}, riskCategoryId=${created.riskCategoryId}`,
    );

    return created;
  }

  async update(id: string, dto: UpdateThoughtLeadershipDto): Promise<any> {
    if (!dto.riskCategoryId) {
      throw new BadRequestException('riskCategoryId is required');
    }

    // Ensure record exists and is not soft-deleted
    await this.findOne(id);

    const updated = await this.prisma.thoughtLeadership.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.link !== undefined ? { link: dto.link } : {}),
        riskCategoryId: dto.riskCategoryId,
        ...(dto.publishedDate !== undefined
          ? { publishedDate: new Date(dto.publishedDate) }
          : {}),
      },
      include: {
        riskCategory: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Updated ThoughtLeadership: id=${updated.id}, riskCategoryId=${updated.riskCategoryId}`,
    );

    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.prisma.thoughtLeadership.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`ThoughtLeadership with ID ${id} not found`);
    }

    // Idempotent: if already deleted, do nothing
    const existingWithDeletedAt = existing as unknown as {
      deletedAt?: Date | null;
    };
    if (existingWithDeletedAt.deletedAt) {
      return;
    }

    await this.prisma.thoughtLeadership.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      } as unknown as Prisma.ThoughtLeadershipUpdateInput,
    });

    this.logger.log(`Soft-deleted ThoughtLeadership: id=${id}`);
  }
}
