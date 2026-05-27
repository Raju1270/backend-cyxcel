import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QuestionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by risk category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  riskCategoryId?: string;

  @ApiPropertyOptional({
    description: 'Order by field',
    default: 'number',
    enum: ['number', 'createdAt', 'updatedAt', 'question'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['number', 'createdAt', 'updatedAt', 'question'])
  orderBy: string = 'number';

  @ApiPropertyOptional({
    description: 'Order direction',
    default: 'ASC',
    enum: ['ASC', 'DESC'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orderDirection: 'ASC' | 'DESC' = 'ASC';
}
