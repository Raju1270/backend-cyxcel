import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { del } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import type { HandleUploadBody } from '@vercel/blob/client';
import type { Request } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';

jest.mock('@vercel/blob', () => ({ del: jest.fn() }));
jest.mock('@vercel/blob/client', () => ({ handleUpload: jest.fn() }));

const delMock = jest.mocked(del);
const handleUploadMock = jest.mocked(handleUpload);

describe('NotificationsService', () => {
  let service: NotificationsService;
  let config: { get: jest.Mock<string | undefined, [string]> };
  let prisma: {
    notification: {
      create: jest.Mock<
        Promise<Record<string, unknown>>,
        [Prisma.NotificationCreateArgs]
      >;
      findMany: jest.Mock<
        Promise<Record<string, unknown>[]>,
        [Prisma.NotificationFindManyArgs]
      >;
      count: jest.Mock<Promise<number>, [Prisma.NotificationCountArgs]>;
      findUnique: jest.Mock<
        Promise<Record<string, unknown> | null>,
        [Prisma.NotificationFindUniqueArgs]
      >;
      update: jest.Mock<
        Promise<Record<string, unknown>>,
        [Prisma.NotificationUpdateArgs]
      >;
    };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    config = { get: jest.fn<string | undefined, [string]>() };
    config.get.mockReturnValue('rw-token');

    prisma = {
      notification: {
        create: jest.fn<
          Promise<Record<string, unknown>>,
          [Prisma.NotificationCreateArgs]
        >(),
        findMany: jest.fn<
          Promise<Record<string, unknown>[]>,
          [Prisma.NotificationFindManyArgs]
        >(),
        count: jest.fn<Promise<number>, [Prisma.NotificationCountArgs]>(),
        findUnique: jest.fn<
          Promise<Record<string, unknown> | null>,
          [Prisma.NotificationFindUniqueArgs]
        >(),
        update: jest.fn<
          Promise<Record<string, unknown>>,
          [Prisma.NotificationUpdateArgs]
        >(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: prisma as unknown as PrismaService,
        },
        {
          provide: ConfigService,
          useValue: config as unknown as ConfigService,
        },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  describe('createUploadToken', () => {
    const body = { type: 'blob.generate-client-token' } as HandleUploadBody;
    const request = {} as Request;

    const requestTokenFor = async (pathname: string) => {
      let constraints: unknown;
      handleUploadMock.mockImplementationOnce(
        async ({ onBeforeGenerateToken }) => {
          constraints = await onBeforeGenerateToken(pathname, null, false);
          return { type: 'blob.generate-client-token', clientToken: 'ct' };
        },
      );

      await service.createUploadToken(body, request);
      return constraints;
    };

    it('limits the token to PDFs with a size cap and a random suffix', async () => {
      await expect(
        requestTokenFor('notifications/report.pdf'),
      ).resolves.toEqual({
        allowedContentTypes: ['application/pdf'],
        maximumSizeInBytes: 50 * 1024 * 1024,
        addRandomSuffix: true,
      });
      expect(handleUploadMock).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'rw-token', body, request }),
      );
    });

    it.each([
      'other/report.pdf',
      'notifications/report.exe',
      'notifications/nested/report.pdf',
      'report.pdf',
    ])('rejects the pathname %s', async (pathname) => {
      await expect(requestTokenFor(pathname)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('answers 503 when the blob token is not configured', () => {
      config.get.mockReturnValue('');

      expect(() => service.createUploadToken(body, request)).toThrow(
        ServiceUnavailableException,
      );
      expect(handleUploadMock).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('stores only the validated fields and never returns the file path', async () => {
      prisma.notification.create.mockResolvedValueOnce({ id: 'n1' });

      await service.create({
        title: 'Title',
        description: 'Description',
        fileName: 'Report.pdf',
        filePath: 'notifications/report-abc.pdf',
      });

      const [args] = prisma.notification.create.mock.calls[0];
      expect(args.data).toEqual({
        title: 'Title',
        description: 'Description',
        fileName: 'Report.pdf',
        filePath: 'notifications/report-abc.pdf',
      });
      expect(args.select).not.toHaveProperty('filePath');
    });
  });

  describe('findAll', () => {
    it('returns the newest page without soft-deleted rows', async () => {
      prisma.notification.findMany.mockResolvedValueOnce([{ id: 'a' }]);
      prisma.notification.count.mockResolvedValueOnce(45);

      const result = await service.findAll({
        page: 2,
        limit: 20,
        orderBy: 'createdAt',
        orderDirection: 'DESC',
      } as NotificationQueryDto);

      expect(result.meta).toEqual({
        total: 45,
        page: 2,
        limit: 20,
        pageCount: 3,
      });

      const [args] = prisma.notification.findMany.mock.calls[0];
      expect(args.where).toEqual({ deletedAt: null });
      expect(args.skip).toBe(20);
      expect(args.take).toBe(20);
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
      expect(args.select).not.toHaveProperty('filePath');
    });
  });

  describe('softDelete', () => {
    it('throws when the notification does not exist', async () => {
      prisma.notification.findUnique.mockResolvedValueOnce(null);

      await expect(service.softDelete('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('is a no-op when it is already deleted', async () => {
      prisma.notification.findUnique.mockResolvedValueOnce({
        filePath: 'notifications/a.pdf',
        deletedAt: new Date(),
      });

      await service.softDelete('n1');

      expect(prisma.notification.update).not.toHaveBeenCalled();
      expect(delMock).not.toHaveBeenCalled();
    });

    it('hides the row first and then removes the PDF from storage', async () => {
      prisma.notification.findUnique.mockResolvedValueOnce({
        filePath: 'notifications/a.pdf',
        deletedAt: null,
      });
      prisma.notification.update.mockResolvedValueOnce({});
      delMock.mockResolvedValueOnce(undefined);

      await service.softDelete('n1');

      const [args] = prisma.notification.update.mock.calls[0];
      expect(args.where).toEqual({ id: 'n1' });
      expect(args.data.deletedAt).toBeInstanceOf(Date);
      expect(delMock).toHaveBeenCalledWith('notifications/a.pdf', {
        token: 'rw-token',
      });
      expect(
        prisma.notification.update.mock.invocationCallOrder[0],
      ).toBeLessThan(delMock.mock.invocationCallOrder[0]);
    });

    it('still succeeds when the storage delete fails', async () => {
      prisma.notification.findUnique.mockResolvedValueOnce({
        filePath: 'notifications/a.pdf',
        deletedAt: null,
      });
      prisma.notification.update.mockResolvedValueOnce({});
      delMock.mockRejectedValueOnce(new Error('storage down'));

      await expect(service.softDelete('n1')).resolves.toBeUndefined();
    });
  });
});
