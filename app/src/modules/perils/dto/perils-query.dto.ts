import { ApiPropertyOptional } from '@nestjs/swagger';
import { Impact, Region } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PerilsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by risk category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  riskCategoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by sector ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  sectorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by impact rating',
    enum: Impact,
  })
  @IsEnum(Impact)
  @IsOptional()
  impact?: Impact;

  @ApiPropertyOptional({
    description: 'Filter by region',
    enum: Region,
  })
  @IsEnum(Region)
  @IsOptional()
  region?: Region;

  @ApiPropertyOptional({
    description:
      'Case-insensitive search across name and description (contains match)',
    example: 'ransomware',
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
    enum: ['name', 'createdAt', 'updatedAt'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['name', 'createdAt', 'updatedAt'])
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
