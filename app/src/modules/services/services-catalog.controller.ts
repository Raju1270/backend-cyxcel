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
import { CreateServiceDto } from './dto/create-service.dto';
import { ServicesQueryDto } from './dto/services-query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesCatalogService } from './services-catalog.service';

@ApiTag('services-catalog')
@Controller('services-catalog')
@UseGuards(ClerkAuthGuard)
export class ServicesCatalogController {
  private readonly logger = new Logger(ServicesCatalogController.name);

  constructor(
    private readonly servicesCatalogService: ServicesCatalogService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get services catalog entries',
    description:
      'Retrieves a paginated list of services. Supports optional filtering by riskCategoryId, search across title/providerName, ordering, and including soft-deleted records (excluded by default).',
  })
  @ApiOkResponse({
    description: 'Returns paginated services',
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
              providerName: { type: 'string' },
              description: { type: 'string' },
              link: { type: 'string' },
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
    @Query() query: ServicesQueryDto,
  ): Promise<{ data: any[]; meta: PaginationMeta }> {
    this.logger.log(
      `GET /services-catalog called with query: ${JSON.stringify(query)}`,
    );
    return this.servicesCatalogService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a service catalog entry',
    description:
      'Retrieves a single service by ID. Soft-deleted records are treated as not found.',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description: 'Returns a service record',
  })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.servicesCatalogService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a service catalog entry',
    description: 'Creates a new service record.',
  })
  @ApiCreatedResponse({ description: 'Service created' })
  async create(@Body() dto: CreateServiceDto): Promise<any> {
    return this.servicesCatalogService.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a service catalog entry',
    description:
      'Updates an existing service record. Soft-deleted records are treated as not found.',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({ description: 'Service updated' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<any> {
    return this.servicesCatalogService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a service catalog entry',
    description:
      'Soft deletes a service record by setting deletedAt. If the record is already deleted, the operation is a no-op.',
  })
  @ApiParam({
    name: 'id',
    description: 'Service ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 204, description: 'Service deleted' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.servicesCatalogService.softDelete(id);
  }
}
