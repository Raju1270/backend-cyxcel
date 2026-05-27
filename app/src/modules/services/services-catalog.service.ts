import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { ServicesQueryDto } from './dto/services-query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesCatalogService {
  private readonly logger = new Logger(ServicesCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ServicesQueryDto,
  ): Promise<{ data: any[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceWhereInput = {};
    const whereWithSoftDelete = where as Prisma.ServiceWhereInput & {
      deletedAt?: Date | string | null;
    };

    if (!query.includeDeleted) {
      whereWithSoftDelete.deletedAt = null;
    }

    if (query.riskCategoryId) {
      where.riskCategoryId = query.riskCategoryId;
    }

    if (query.q) {
      where.OR = [
        {
          title: {
            contains: query.q,
            mode: 'insensitive',
          },
        },
        {
          providerName: {
            contains: query.q,
            mode: 'insensitive',
          },
        },
      ];
    }

    const orderBy = query.orderBy ?? 'updatedAt';
    const orderDirection = query.orderDirection ?? 'DESC';

    const orderByClause: Prisma.ServiceOrderByWithRelationInput = {
      [orderBy]: orderDirection.toLowerCase(),
    };

    const [data, total] = await Promise.all([
      this.prisma.service.findMany({
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
      this.prisma.service.count({ where }),
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
    } as Prisma.ServiceWhereInput;

    const record = await this.prisma.service.findFirst({
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
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return record;
  }

  async create(dto: CreateServiceDto): Promise<any> {
    const created = await this.prisma.service.create({
      data: {
        title: dto.title,
        providerName: dto.providerName,
        riskCategoryId: dto.riskCategoryId,
        description: dto.description,
        link: dto.link,
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
      `Created Service: id=${created.id}, riskCategoryId=${created.riskCategoryId}`,
    );

    return created;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<any> {
    if (!dto.riskCategoryId) {
      throw new BadRequestException('riskCategoryId is required');
    }

    // Ensure record exists and is not soft-deleted
    await this.findOne(id);

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.providerName !== undefined
          ? { providerName: dto.providerName }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.link !== undefined ? { link: dto.link } : {}),
        riskCategoryId: dto.riskCategoryId,
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
      `Updated Service: id=${updated.id}, riskCategoryId=${updated.riskCategoryId}`,
    );

    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    // Idempotent: if already deleted, do nothing
    const existingWithDeletedAt = existing as unknown as {
      deletedAt?: Date | null;
    };
    if (existingWithDeletedAt.deletedAt) {
      return;
    }

    await this.prisma.service.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      } as Prisma.ServiceUpdateInput,
    });

    this.logger.log(`Soft-deleted Service: id=${id}`);
  }
}
