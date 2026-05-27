import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiTag } from '../../common/decorators/swagger.decorators';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';
import { ClerkAuthGuard } from '../auth';
import { ThoughtLeadershipService } from './thought-leadership.service';
import { ThoughtLeadershipQueryDto } from './dto/thought-leadership-query.dto';
import { CreateThoughtLeadershipDto } from './dto/create-thought-leadership.dto';
import { UpdateThoughtLeadershipDto } from './dto/update-thought-leadership.dto';

@ApiTag('thought-leadership')
@Controller('thought-leadership')
@UseGuards(ClerkAuthGuard)
export class ThoughtLeadershipController {
  private readonly logger = new Logger(ThoughtLeadershipController.name);

  constructor(
    private readonly thoughtLeadershipService: ThoughtLeadershipService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get thought leadership articles',
    description:
      'Retrieves a paginated list of thought leadership records. Supports optional filtering by riskCategoryId, title search, published date range, and ordering. Soft-deleted records are excluded by default.',
  })
  @ApiOkResponse({
    description: 'Returns paginated thought leadership records',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              riskCategoryId: { type: 'string' },
              title: { type: 'string' },
              link: { type: 'string' },
              publishedDate: { type: 'string', format: 'date-time' },
              deletedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              riskCategory: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  slug: { type: 'string' },
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
    @Query() query: ThoughtLeadershipQueryDto,
  ): Promise<{ data: any[]; meta: PaginationMeta }> {
    this.logger.log(
      `GET /thought-leadership called with query: ${JSON.stringify(query)}`,
    );
    return this.thoughtLeadershipService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a thought leadership article',
    description:
      'Retrieves a single thought leadership record by ID. Soft-deleted records are treated as not found.',
  })
  @ApiParam({
    name: 'id',
    description: 'Thought leadership ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Returns a thought leadership record',
  })
  @ApiResponse({ status: 404, description: 'Thought leadership not found' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.thoughtLeadershipService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a thought leadership article',
    description: 'Creates a new thought leadership record.',
  })
  @ApiCreatedResponse({ description: 'Thought leadership created' })
  async create(@Body() dto: CreateThoughtLeadershipDto): Promise<any> {
    return this.thoughtLeadershipService.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a thought leadership article',
    description:
      'Updates an existing thought leadership record. Soft-deleted records are treated as not found.',
  })
  @ApiParam({
    name: 'id',
    description: 'Thought leadership ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({ description: 'Thought leadership updated' })
  @ApiResponse({ status: 404, description: 'Thought leadership not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateThoughtLeadershipDto,
  ): Promise<any> {
    return this.thoughtLeadershipService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a thought leadership article',
    description:
      'Soft deletes a thought leadership record by setting deletedAt. If the record is already deleted, the operation is a no-op.',
  })
  @ApiParam({
    name: 'id',
    description: 'Thought leadership ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 204, description: 'Thought leadership deleted' })
  @ApiResponse({ status: 404, description: 'Thought leadership not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.thoughtLeadershipService.softDelete(id);
  }
}
