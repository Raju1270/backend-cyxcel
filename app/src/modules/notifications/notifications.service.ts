import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { del } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import type { HandleUploadBody } from '@vercel/blob/client';
import type { Request } from 'express';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  MAX_NOTIFICATION_FILE_BYTES,
  NOTIFICATION_FILE_PATH_PATTERN,
} from './notifications.constants';

// THE FILE PATHNAME STAYS SERVER-SIDE: USERS ONLY EVER GET A SHORT-LIVED SIGNED URL FROM THE USER PANEL.
const NOTIFICATION_SELECT = {
  id: true,
  title: true,
  description: true,
  fileName: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

type NotificationSummary = Prisma.NotificationGetPayload<{
  select: typeof NOTIFICATION_SELECT;
}>;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  createUploadToken(
    body: HandleUploadBody,
    request: Request,
  ): ReturnType<typeof handleUpload> {
    return handleUpload({
      token: this.getBlobToken(),
      body,
      request,
      onBeforeGenerateToken: (pathname) => {
        if (!NOTIFICATION_FILE_PATH_PATTERN.test(pathname)) {
          throw new BadRequestException(
            'Only PDF files under notifications/ can be uploaded',
          );
        }

        return Promise.resolve({
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: MAX_NOTIFICATION_FILE_BYTES,
          addRandomSuffix: true,
        });
      },
    });
  }

  async create(dto: CreateNotificationDto): Promise<NotificationSummary> {
    const created = await this.prisma.notification.create({
      data: {
        title: dto.title,
        description: dto.description,
        fileName: dto.fileName,
        filePath: dto.filePath,
      },
      select: NOTIFICATION_SELECT,
    });

    this.logger.log(`Created Notification: id=${created.id}`);

    return created;
  }

  async findAll(
    query: NotificationQueryDto,
  ): Promise<{ data: NotificationSummary[]; meta: PaginationMeta }> {
    const { page, limit } = query;
    const where: Prisma.NotificationWhereInput = { deletedAt: null };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [query.orderBy]: query.orderDirection.toLowerCase() },
        select: NOTIFICATION_SELECT,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, pageCount: Math.ceil(total / limit) },
    };
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
      select: { filePath: true, deletedAt: true },
    });

    if (!existing) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    // Idempotent: if already deleted, do nothing.
    if (existing.deletedAt) return;

    await this.prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Soft-deleted Notification: id=${id}`);

    // THE ROW IS ALREADY HIDDEN, SO A STORAGE FAILURE ONLY LEAVES AN ORPHAN FILE.
    await this.removeFile(existing.filePath);
  }

  private async removeFile(pathname: string): Promise<void> {
    try {
      await del(pathname, { token: this.getBlobToken() });
    } catch (error) {
      this.logger.warn(
        `Notification file was not removed from storage: ${pathname} (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }

  private getBlobToken(): string {
    const token = this.config.get<string>('blob.readWriteToken');

    if (!token) {
      throw new ServiceUnavailableException('File storage is not configured');
    }

    return token;
  }
}
