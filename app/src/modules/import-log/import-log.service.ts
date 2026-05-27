import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportLogQueryDto } from './dto/import-log-query.dto';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

@Injectable()
export class ImportLogService {
  private readonly logger = new Logger(ImportLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates an ImportLog record for a successful import
   * @param userId - User ID who performed the import
   * @param filename - Name of the imported file
   * @param rowCount - Number of rows successfully imported
   * @returns The created ImportLog record or null if creation failed
   */
  async createSuccessLog(
    userId: string,
    filename: string,
    rowCount: number,
  ): Promise<{ id: string } | null> {
    try {
      const importLog = await this.prisma.importLog.create({
        data: {
          userId,
          filename,
          rowCount,
          status: 'SUCCESS' as const,
        },
      });
      this.logger.log(
        `Created ImportLog: id=${importLog.id}, userId=${userId}, filename='${filename}', rowCount=${rowCount}`,
      );
      return importLog;
    } catch (error) {
      this.logger.error(
        `Failed to create ImportLog for successful import:`,
        error,
      );
      // Don't throw error - logging failure shouldn't fail the request
      return null;
    }
  }

  /**
   * Creates an ImportLog record for a failed import
   * @param userId - User ID who attempted the import
   * @param filename - Name of the imported file
   * @param rowCount - Number of rows attempted (default: 0)
   * @returns The created ImportLog record or null if creation failed
   */
  async createFailedLog(
    userId: string,
    filename: string,
    rowCount: number = 0,
  ): Promise<{ id: string } | null> {
    try {
      const importLog = await this.prisma.importLog.create({
        data: {
          userId,
          filename,
          rowCount,
          status: 'FAILED' as const,
        },
      });
      this.logger.log(
        `Created ImportLog for failed import: id=${importLog.id}, userId=${userId}, filename='${filename}', rowCount=${rowCount}`,
      );
      return importLog;
    } catch (error) {
      this.logger.error(`Failed to create ImportLog for failed import:`, error);
      // Don't throw error - we're already in error handling
      return null;
    }
  }

  /**
   * Creates an ImportLog record (convenience method that chooses success/failed based on status)
   * @param userId - User ID who performed/attempted the import
   * @param filename - Name of the imported file
   * @param rowCount - Number of rows imported/attempted
   * @param isSuccess - Whether the import was successful
   * @returns The created ImportLog record or null if creation failed
   */
  async createLog(
    userId: string,
    filename: string,
    rowCount: number,
    isSuccess: boolean,
  ): Promise<{ id: string } | null> {
    return isSuccess
      ? this.createSuccessLog(userId, filename, rowCount)
      : this.createFailedLog(userId, filename, rowCount);
  }

  /**
   * Finds all import logs with pagination, filtering, and ordering
   * @param query - Query parameters for pagination, filtering, and ordering
   * @returns Paginated import logs with metadata
   */
  async findAll(
    query: ImportLogQueryDto,
  ): Promise<{ data: any[]; meta: PaginationMeta }> {
    const { page, limit, userId, filename, status, orderBy, orderDirection } =
      query;
    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }
    if (filename) {
      where.filename = {
        contains: filename,
        mode: 'insensitive',
      };
    }
    if (status) {
      where.status = status;
    }

    // Build orderBy clause
    const orderByClause: any = {};
    orderByClause[orderBy] = orderDirection.toLowerCase();

    // Execute queries in parallel
    const [data, total] = await Promise.all([
      this.prisma.importLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.importLog.count({ where }),
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
}
