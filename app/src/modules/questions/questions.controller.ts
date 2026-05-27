import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { ApiTag } from '../../common/decorators/swagger.decorators';
import { ClerkAuthGuard } from '../auth';
import { QuestionsService } from './questions.service';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsQueryDto } from './dto/questions-query.dto';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

@ApiTag('questions')
@Controller('questions')
@UseGuards(ClerkAuthGuard)
export class QuestionsController {
  private readonly logger = new Logger(QuestionsController.name);

  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all questions',
    description:
      'Retrieves a paginated list of all questions (both active and inactive). Supports optional filtering by riskCategoryId and ordering by number, createdAt, updatedAt, or question text.',
  })
  @ApiOkResponse({
    description: 'Returns paginated questions',
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
              question: { type: 'string' },
              number: { type: 'number' },
              inactive: { type: 'boolean' },
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
    @Query() query: QuestionsQueryDto,
  ): Promise<{ data: any[]; meta: PaginationMeta }> {
    this.logger.log(
      `GET /questions called with query: ${JSON.stringify(query)}`,
    );
    const result = await this.questionsService.findAll(query);
    return result;
  }

  @Get(':id/version-history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get question version history',
    description:
      'Retrieves the complete version history of a question. If the provided ID is an inactive question, it will find the active version that replaced it and return all versions in the chain. Returns all versions from oldest to newest (current active version).',
  })
  @ApiParam({
    name: 'id',
    description: 'Question ID to get version history for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkResponse({
    description:
      'Returns array of question versions in chronological order (oldest to newest)',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          riskCategoryId: { type: 'string' },
          question: { type: 'string' },
          number: { type: 'number' },
          inactive: { type: 'boolean' },
          replacedById: {
            type: 'string',
            nullable: true,
            description:
              'ID of the active question that replaced this inactive question',
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
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
  })
  async getVersionHistory(@Param('id') id: string): Promise<any[]> {
    this.logger.log(`GET /questions/${id}/versions called`);
    try {
      const result = await this.questionsService.getVersionHistory(id);
      this.logger.log(`Returning ${result.length} versions for question ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Error getting version history for question ${id}: ${error.message}`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.stack,
      );
      throw error;
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a question',
    description:
      'Updates a question by marking the old question as inactive and creating a new question record with the updated text. The new question retains the same riskCategoryId and number (ordering) as the original. The inactive question maintains a reference (replacedById) to the active question that replaced it for versioning purposes.',
  })
  @ApiParam({
    name: 'id',
    description: 'Question ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateQuestionDto,
    description: 'Updated question text',
  })
  @ApiResponse({
    status: 200,
    description:
      'Question updated successfully. Returns the newly created question.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        riskCategoryId: { type: 'string' },
        question: { type: 'string' },
        number: { type: 'number' },
        inactive: { type: 'boolean' },
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
  })
  @ApiResponse({
    status: 404,
    description: 'Question not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  async updateQuestion(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ): Promise<any> {
    return await this.questionsService.updateQuestion(id, updateQuestionDto);
  }
}
