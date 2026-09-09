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
import { CreatePerilDto } from './dto/create-peril.dto';
import { PerilsQueryDto } from './dto/perils-query.dto';
import { UpdatePerilDto } from './dto/update-peril.dto';
import { PerilsService } from './perils.service';

import {
  NatureOfLossService,
  RiskCategoriesService,
  SectorsService,
} from './perils.service';

@ApiTag('perils')
@Controller('perils')
@UseGuards(ClerkAuthGuard)
export class PerilsController {
  private readonly logger = new Logger(PerilsController.name);

  constructor(private readonly perilsService: PerilsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get perils',
    description:
      'Retrieves a paginated list of perils. Supports optional filtering by riskCategoryId, sectorId, impact, region, search across name/description, ordering, and including soft-deleted records (excluded by default).',
  })
  @ApiOkResponse({
    description: 'Returns paginated perils',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              description: { type: 'string' },
              impact: { type: 'string', nullable: true },
              region: { type: 'array', items: { type: 'string' } },
              deletedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              riskCategories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    slug: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
              natureOfLosses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    slug: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
              sectors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    role: { type: 'string' },
                  },
                },
              },
              likelihood: {
                type: 'object',
                nullable: true,
                description:
                  'Most recent EU/US/UK likelihood snapshot for this peril, if one has ever been set (via this API or the peril-likelihood Excel import).',
                properties: {
                  eu: { type: 'string' },
                  us: { type: 'string' },
                  uk: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
              control: {
                type: 'object',
                nullable: true,
                description:
                  'The single control mapped to this peril, if one has been set.',
                properties: {
                  id: { type: 'string' },
                  question: { type: 'string' },
                  source: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
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
    @Query() query: PerilsQueryDto,
  ): Promise<{ data: any[]; meta: PaginationMeta }> {
    this.logger.log(`GET /perils called with query: ${JSON.stringify(query)}`);
    return this.perilsService.findAll(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a peril',
    description:
      'Retrieves a single peril by ID. Soft-deleted records are treated as not found.',
  })
  @ApiParam({
    name: 'id',
    description: 'Peril ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({ description: 'Returns a peril record' })
  @ApiResponse({ status: 404, description: 'Peril not found' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.perilsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a peril',
    description: 'Creates a new peril record.',
  })
  @ApiCreatedResponse({ description: 'Peril created' })
  async create(@Body() dto: CreatePerilDto): Promise<any> {
    return this.perilsService.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a peril',
    description:
      'Updates an existing peril record. Soft-deleted records are treated as not found.',
  })
  @ApiParam({
    name: 'id',
    description: 'Peril ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({ description: 'Peril updated' })
  @ApiResponse({ status: 404, description: 'Peril not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePerilDto,
  ): Promise<any> {
    return this.perilsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete a peril',
    description:
      'Soft deletes a peril record by setting deletedAt. If the record is already deleted, the operation is a no-op.',
  })
  @ApiParam({
    name: 'id',
    description: 'Peril ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 204, description: 'Peril deleted' })
  @ApiResponse({ status: 404, description: 'Peril not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.perilsService.softDelete(id);
  }
}

@ApiTag('risk-categories')
@Controller('risk-categories')
@UseGuards(ClerkAuthGuard)
export class RiskCategoriesController {
  private readonly logger = new Logger(RiskCategoriesController.name);

  constructor(private readonly riskCategoriesService: RiskCategoriesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get risk categories',
    description:
      'Returns all risk categories (id, slug, name), sorted by name — for filters/selects.',
  })
  @ApiOkResponse({
    description: 'Returns risk categories',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          name: { type: 'string' },
        },
      },
    },
  })
  async findAll(): Promise<{ id: string; slug: string; name: string }[]> {
    this.logger.log('GET /risk-categories called');
    return this.riskCategoriesService.findAll();
  }
}

@ApiTag('nature-of-loss')
@Controller('nature-of-loss')
@UseGuards(ClerkAuthGuard)
export class NatureOfLossController {
  private readonly logger = new Logger(NatureOfLossController.name);

  constructor(private readonly natureOfLossService: NatureOfLossService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get nature of loss',
    description:
      'Returns all nature of loss records (id, slug, name, definition, primary/secondary owners), sorted by name.',
  })
  @ApiOkResponse({
    description: 'Returns nature of loss records',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          name: { type: 'string' },
          definition: { type: 'string' },
          primaryOwner: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
          secondaryOwners: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  async findAll(): Promise<any[]> {
    this.logger.log('GET /nature-of-loss called');
    return this.natureOfLossService.findAll();
  }
}

@ApiTag('sectors')
@Controller('sectors')
@UseGuards(ClerkAuthGuard)
export class SectorsController {
  private readonly logger = new Logger(SectorsController.name);

  constructor(private readonly sectorsService: SectorsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get sectors',
    description:
      'Returns all sectors (id, name, role), sorted by name — for filters/selects, and for mapping which sectors a peril affects.',
  })
  @ApiOkResponse({
    description: 'Returns sectors',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
        },
      },
    },
  })
  async findAll(): Promise<{ id: string; name: string; role: string }[]> {
    this.logger.log('GET /sectors called');
    return this.sectorsService.findAll();
  }
}
