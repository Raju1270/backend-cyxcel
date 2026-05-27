import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ApiTag } from '../../common/decorators/swagger.decorators';
import { DevOnlyGuard } from '../../common/guards/dev-only.guard';
import { PostmanService } from './postman.service';
import {
  CollectionMetadataDto,
  CollectionDetailDto,
} from './dto/collection-response.dto';

@ApiTag('Postman')
@Controller('collections')
@UseGuards(DevOnlyGuard)
export class PostmanController {
  constructor(private readonly postmanService: PostmanService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all Postman collections',
    description:
      'Retrieves metadata for all collections in the Postman workspace',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of collections metadata',
    type: [CollectionMetadataDto],
  })
  @ApiResponse({
    status: 503,
    description: 'Postman API key is not configured',
  })
  async getAllCollections(): Promise<CollectionMetadataDto[]> {
    return await this.postmanService.getAllCollections();
  }

  @Get('latest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the latest Postman collection',
    description:
      'Returns the most recently updated collection with full details in JSON format',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest collection with all details',
    type: CollectionDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No collections found in Postman workspace',
  })
  @ApiResponse({
    status: 503,
    description: 'Postman API key is not configured',
  })
  async getLatestCollection(): Promise<any> {
    return await this.postmanService.getLatestCollection();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a specific collection by ID',
    description:
      'Returns full collection details in JSON format for the specified collection UID',
  })
  @ApiParam({
    name: 'id',
    description: 'Collection UID',
    example: '12345678-12345678-1234-5678-1234-567812345678',
  })
  @ApiResponse({
    status: 200,
    description: 'Full collection details',
    type: CollectionDetailDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Postman API key is not configured',
  })
  async getCollectionById(@Param('id') id: string): Promise<any> {
    return await this.postmanService.getCollectionById(id);
  }
}
