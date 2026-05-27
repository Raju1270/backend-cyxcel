import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export enum ImportStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export class ImportLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'user-123',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by filename (partial match)',
    example: 'data.xlsx',
  })
  @IsString()
  @IsOptional()
  filename?: string;

  @ApiPropertyOptional({
    description: 'Filter by import status',
    enum: ImportStatus,
    example: ImportStatus.SUCCESS,
  })
  @IsEnum(ImportStatus)
  @IsOptional()
  status?: ImportStatus;

  @ApiPropertyOptional({
    description: 'Order by field',
    default: 'createdAt',
    enum: [
      'userId',
      'filename',
      'status',
      'rowCount',
      'createdAt',
      'updatedAt',
    ],
  })
  @IsString()
  @IsOptional()
  @IsIn(['userId', 'filename', 'status', 'rowCount', 'createdAt', 'updatedAt'])
  orderBy: string = 'createdAt';

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
