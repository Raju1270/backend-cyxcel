import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ServicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by risk category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  riskCategoryId?: string;

  @ApiPropertyOptional({
    description:
      'Case-insensitive search across title and providerName (contains match)',
    example: 'cyber',
  })
  @IsString()
  @IsOptional()
  q?: string;

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
    default: 'updatedAt',
    enum: ['title', 'providerName', 'createdAt', 'updatedAt'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['title', 'providerName', 'createdAt', 'updatedAt'])
  orderBy: string = 'updatedAt';

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
