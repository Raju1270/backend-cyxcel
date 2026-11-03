import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Order by field',
    default: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'title'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'title'])
  orderBy: string = 'createdAt';
}
