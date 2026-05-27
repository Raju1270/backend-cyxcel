import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ThoughtLeadershipQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by risk category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  riskCategoryId?: string;

  @ApiPropertyOptional({
    description: 'Case-insensitive search in title (contains match)',
    example: 'cyber',
  })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({
    description: 'Published date start (inclusive) as ISO string',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  publishedFrom?: string;

  @ApiPropertyOptional({
    description: 'Published date end (inclusive) as ISO string',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsDateString()
  @IsOptional()
  publishedTo?: string;

  @ApiPropertyOptional({
    description: 'Include soft-deleted records',
    default: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'Order by field',
    default: 'publishedDate',
    enum: ['publishedDate', 'createdAt', 'updatedAt', 'title'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['publishedDate', 'createdAt', 'updatedAt', 'title'])
  orderBy: string = 'publishedDate';

  @ApiPropertyOptional({
    description: 'Order direction',
    default: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderDirection: 'ASC' | 'DESC' = 'DESC';
}
