import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ThoughtLeadershipService } from './thought-leadership.service';
import { ThoughtLeadershipQueryDto } from './dto/thought-leadership-query.dto';

describe('ThoughtLeadershipService', () => {
  let service: ThoughtLeadershipService;
  let prisma: {
    thoughtLeadership: {
      findMany: jest.Mock<
        Promise<Record<string, unknown>[]>,
        [Prisma.ThoughtLeadershipFindManyArgs]
      >;
      count: jest.Mock<Promise<number>, [Prisma.ThoughtLeadershipCountArgs]>;
      findFirst: jest.Mock<
        Promise<Record<string, unknown> | null>,
        [Prisma.ThoughtLeadershipFindFirstArgs]
      >;
      findUnique: jest.Mock<
        Promise<Record<string, unknown> | null>,
        [Prisma.ThoughtLeadershipFindUniqueArgs]
      >;
      create: jest.Mock<
        Promise<Record<string, unknown>>,
        [Prisma.ThoughtLeadershipCreateArgs]
      >;
      update: jest.Mock<
        Promise<Record<string, unknown>>,
        [Prisma.ThoughtLeadershipUpdateArgs]
      >;
    };
  };

  beforeEach(async () => {
    prisma = {
      thoughtLeadership: {
        findMany: jest.fn<
          Promise<Record<string, unknown>[]>,
          [Prisma.ThoughtLeadershipFindManyArgs]
        >(),
        count: jest.fn<Promise<number>, [Prisma.ThoughtLeadershipCountArgs]>(),
        findFirst: jest.fn<
          Promise<Record<string, unknown> | null>,
          [Prisma.ThoughtLeadershipFindFirstArgs]
        >(),
        findUnique: jest.fn<
          Promise<Record<string, unknown> | null>,
          [Prisma.ThoughtLeadershipFindUniqueArgs]
        >(),
        create: jest.fn<
          Promise<Record<string, unknown>>,
          [Prisma.ThoughtLeadershipCreateArgs]
        >(),
        update: jest.fn<
          Promise<Record<string, unknown>>,
          [Prisma.ThoughtLeadershipUpdateArgs]
        >(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThoughtLeadershipService,
        {
          provide: PrismaService,
          useValue: prisma as unknown as PrismaService,
        },
      ],
    }).compile();

    service = module.get(ThoughtLeadershipService);
  });

  it('returns paginated results with meta', async () => {
    prisma.thoughtLeadership.findMany.mockResolvedValueOnce([
      { id: 'a' },
      { id: 'b' },
    ]);
    prisma.thoughtLeadership.count.mockResolvedValueOnce(5);

    const result = await service.findAll({
      page: 1,
      limit: 2,
      orderBy: 'publishedDate',
      orderDirection: 'DESC',
    } as ThoughtLeadershipQueryDto);

    expect(result.meta).toEqual({
      total: 5,
      page: 1,
      limit: 2,
      pageCount: 3,
    });

    expect(prisma.thoughtLeadership.findMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = prisma.thoughtLeadership.findMany.mock.calls[0];
    expect(findManyArgs.skip).toBe(0);
    expect(findManyArgs.take).toBe(2);
    expect(findManyArgs.where).toEqual(
      expect.objectContaining({
        deletedAt: null,
      }),
    );
  });

  it('supports includeDeleted=true by not filtering deletedAt', async () => {
    prisma.thoughtLeadership.findMany.mockResolvedValueOnce([]);
    prisma.thoughtLeadership.count.mockResolvedValueOnce(0);

    await service.findAll({
      includeDeleted: true,
      page: 1,
      limit: 20,
      orderBy: 'publishedDate',
      orderDirection: 'DESC',
    } as ThoughtLeadershipQueryDto);

    expect(prisma.thoughtLeadership.findMany).toHaveBeenCalledTimes(1);
    const [findManyArgs] = prisma.thoughtLeadership.findMany.mock.calls[0];
    const where = findManyArgs.where ?? {};
    expect(where).not.toHaveProperty('deletedAt');
  });

  it('creates and updates records', async () => {
    prisma.thoughtLeadership.create.mockResolvedValueOnce({ id: 'new-id' });
    prisma.thoughtLeadership.findFirst.mockResolvedValueOnce({ id: 'new-id' });
    prisma.thoughtLeadership.update.mockResolvedValueOnce({
      id: 'new-id',
      title: 'updated',
    });

    await service.create({
      title: 'Title',
      link: 'https://example.com',
      riskCategoryId: 'rc-id',
      publishedDate: '2025-10-07T00:00:00.000Z',
    });

    expect(prisma.thoughtLeadership.create).toHaveBeenCalledTimes(1);
    const [createArgs] = prisma.thoughtLeadership.create.mock.calls[0];
    expect(createArgs.data.title).toBe('Title');
    expect(createArgs.data.link).toBe('https://example.com');
    expect(createArgs.data.riskCategoryId).toBe('rc-id');
    expect(createArgs.data.publishedDate).toBeInstanceOf(Date);

    await expect(
      service.update('new-id', {
        title: 'updated',
        riskCategoryId: 'rc-id',
      }),
    ).resolves.toEqual({ id: 'new-id', title: 'updated' });
    expect(prisma.thoughtLeadership.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = prisma.thoughtLeadership.update.mock.calls[0];
    expect(updateArgs.where).toEqual({ id: 'new-id' });
    expect(updateArgs.data).toEqual(
      expect.objectContaining({
        title: 'updated',
        riskCategoryId: 'rc-id',
      }),
    );
  });

  it('softDelete is idempotent', async () => {
    prisma.thoughtLeadership.findUnique.mockResolvedValueOnce({
      id: 'id-1',
      deletedAt: new Date(),
    });

    await service.softDelete('id-1');
    expect(prisma.thoughtLeadership.update).not.toHaveBeenCalled();

    prisma.thoughtLeadership.findUnique.mockResolvedValueOnce({
      id: 'id-2',
      deletedAt: null,
    });

    await service.softDelete('id-2');
    expect(prisma.thoughtLeadership.update).toHaveBeenCalledTimes(1);
    const [updateArgs] = prisma.thoughtLeadership.update.mock.calls[0];
    expect(updateArgs.where).toEqual({ id: 'id-2' });
    const deletedAt = (updateArgs.data as { deletedAt?: unknown }).deletedAt;
    expect(deletedAt).toBeInstanceOf(Date);
  });
});
