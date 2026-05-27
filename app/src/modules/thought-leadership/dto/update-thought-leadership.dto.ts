import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class UpdateThoughtLeadershipDto {
  @ApiPropertyOptional({
    description: 'Article title',
    example: 'Managing cyber risk in 2026',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Risk category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  riskCategoryId: string;

  @ApiPropertyOptional({
    description: 'Public URL to the content',
    example: 'https://example.com/articles/cyber-risk-2026',
  })
  @IsUrl()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional({
    description: 'Published date as ISO string',
    example: '2025-10-07T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  publishedDate?: string;
}
