import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ServicesQueryDto } from './dto/services-query.dto';
import { ServicesCatalogService } from './services-catalog.service';

describe('ServicesCatalogService', () => {
  let service: ServicesCatalogService;
  let prisma: {
    service: {
      findMany: jest.Mock<
        Promise<Record<string, unknown>[]>,
        [Prisma.ServiceFindManyArgs]
      >;
      count: jest.Mock<Promise<number>, [Prisma.ServiceCountArgs]>;
      findFirst: jest.Mock<
        Promise<Record<string, unknown> | null>,
        [Prisma.ServiceFindFirstArgs]
      >;
      findUnique: jest.Mock<
        Promise<Record<string, unknown> | null>,
        [Prisma.ServiceFindUniqueArgs]
      >;
      create: jest.Mock<
        Promise<Record<string, unknown>>,
        [Prisma.ServiceCreateArgs]
      >;
      update: jest.Mock<
        Promise<Record<string, unknown>>,
        [Prisma.ServiceUpdateArgs]
      >;
    };
  };

  beforeEach(async () => {
    prisma = {
      service: {
        findMany: jest.fn<
          Promise<Record<string, unknown>[]>,
          [Prisma.ServiceFindManyArgs]
        >(),
        count: jest.fn<Promise<number>, [Prisma.ServiceCountArgs]>(),
        findFirst: jest.fn<
          Promise<Record<string, unknown> | null>,
          [Prisma.ServiceFindFirstArgs]
        >(),
        findUnique: jest.fn<
          Promise<Record<string, unknown> | null>,
          [Prisma.ServiceFindUniqueArgs]
        >(),
        create: jest.fn<
          Promise<Record<string, unknown>>,
          [Prisma.ServiceCreateArgs]
        >(),
        update: jest.fn<
          Promise<Record<string, unknown>>,
          [Prisma.ServiceUpdateArgs]
        >(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesCatalogService,
        {
          provide: PrismaService,
          useValue: prisma as unknown as PrismaService,
        },
      ],
    }).compile();

    service = module.get(ServicesCatalogService);
  });

  it('returns paginated results with meta', async () => {
    prisma.service.findMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
    prisma.service.count.mockResolvedValueOnce(5);

    const result = await service.findAll({
      page: 1,
      limit: 2,
      orderBy: 'updatedAt',
      orderDirection: 'DESC',
    } as ServicesQueryDto);

    expect(result.meta).toEqual({
      total: 5,
      page: 1,
      limit: 2,
      pageCount: 3,
    });

    expect(prisma.service.findMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = prisma.service.findMany.mock.calls[0];
    expect(findManyArgs.skip).toBe(0);
    expect(findManyArgs.take).toBe(2);
    expect(findManyArgs.where).toEqual(
      expect.objectContaining({
        deletedAt: null,
      }),
    );
  });

  it('supports includeDeleted=true by not filtering deletedAt', async () => {
    prisma.service.findMany.mockResolvedValueOnce([]);
    prisma.service.count.mockResolvedValueOnce(0);

    await service.findAll({
      includeDeleted: true,
      page: 1,
      limit: 20,
      orderBy: 'updatedAt',
      orderDirection: 'DESC',
    } as ServicesQueryDto);

    expect(prisma.service.findMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = prisma.service.findMany.mock.calls[0];
    const where = findManyArgs.where ?? {};
    expect(where).not.toHaveProperty('deletedAt');
  });

  it('creates and updates records', async () => {
    prisma.service.create.mockResolvedValueOnce({ id: 'new-id' });
    prisma.service.findFirst.mockResolvedValueOnce({ id: 'new-id' });
    prisma.service.update.mockResolvedValueOnce({
      id: 'new-id',
      title: 'updated',
    });

    await service.create({
      title: 'Title',
      providerName: 'Provider',
      riskCategoryId: 'rc-id',
      description: 'Desc',
      link: 'https://example.com',
    });

    expect(prisma.service.create).toHaveBeenCalledTimes(1);
    const [createArgs] = prisma.service.create.mock.calls[0];
    expect(createArgs.data.title).toBe('Title');
    expect(createArgs.data.providerName).toBe('Provider');
    expect(createArgs.data.riskCategoryId).toBe('rc-id');
    expect(createArgs.data.description).toBe('Desc');
    expect(createArgs.data.link).toBe('https://example.com');

    await expect(
      service.update('new-id', {
        title: 'updated',
        riskCategoryId: 'rc-id',
      }),
    ).resolves.toEqual({ id: 'new-id', title: 'updated' });

    expect(prisma.service.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = prisma.service.update.mock.calls[0];
    expect(updateArgs.where).toEqual({ id: 'new-id' });
    expect(updateArgs.data).toEqual(
      expect.objectContaining({
        title: 'updated',
        riskCategoryId: 'rc-id',
      }),
    );
  });

  it('softDelete is idempotent', async () => {
    prisma.service.findUnique.mockResolvedValueOnce({
      id: 'id-1',
      deletedAt: new Date(),
    });

    await service.softDelete('id-1');
    expect(prisma.service.update).not.toHaveBeenCalled();

    prisma.service.findUnique.mockResolvedValueOnce({
      id: 'id-2',
      deletedAt: null,
    });

    await service.softDelete('id-2');
    expect(prisma.service.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = prisma.service.update.mock.calls[0];
    expect(updateArgs.where).toEqual({ id: 'id-2' });
    const deletedAt = (updateArgs.data as { deletedAt?: unknown }).deletedAt;
    expect(deletedAt).toBeInstanceOf(Date);
  });
});
