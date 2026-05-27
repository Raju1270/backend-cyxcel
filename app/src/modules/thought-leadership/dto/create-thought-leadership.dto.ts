import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateThoughtLeadershipDto {
  @ApiProperty({
    description: 'Article title',
    example: 'Managing cyber risk in 2026',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Risk category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  riskCategoryId: string;

  @ApiProperty({
    description: 'Public URL to the content',
    example: 'https://example.com/articles/cyber-risk-2026',
  })
  @IsUrl()
  @IsNotEmpty()
  link: string;

  @ApiProperty({
    description: 'Published date as ISO string',
    example: '2025-10-07T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  publishedDate: string;
}
