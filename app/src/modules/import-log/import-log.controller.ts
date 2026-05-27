import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { ApiTag } from '../../common/decorators/swagger.decorators';
import { ClerkAuthGuard } from '../auth';
import { ImportLogService } from './import-log.service';
import { ImportLogQueryDto } from './dto/import-log-query.dto';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

@ApiTag('import-log')
@Controller('import-log')
@UseGuards(ClerkAuthGuard)
export class ImportLogController {
  constructor(private readonly importLogService: ImportLogService) {}

  @Get()
  @ApiOperation({
    summary: 'Get paginated import logs',
    description:
      'Retrieves a paginated list of import logs with optional filtering by userId, filename, and status. Supports ordering by userId, filename, status, rowCount, createdAt, or updatedAt.',
  })
  @ApiOkResponse({
    description: 'Returns paginated import logs',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              filename: { type: 'string' },
              rowCount: { type: 'number' },
              status: { type: 'string', enum: ['SUCCESS', 'FAILED'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            pageCount: { type: 'number' },
          },
        },
      },
    },
  })
  async findAll(
    @Query() query: ImportLogQueryDto,
  ): Promise<{ data: any[]; meta: PaginationMeta }> {
    return this.importLogService.findAll(query);
  }
}
