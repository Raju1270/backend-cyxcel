import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateServiceDto {
  @ApiPropertyOptional({
    description: 'Service title',
    example: 'Incident response retainer',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Provider name',
    example: 'Acme Cyber',
  })
  @IsString()
  @IsOptional()
  providerName?: string;

  @ApiProperty({
    description: 'Risk category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  riskCategoryId: string;

  @ApiPropertyOptional({
    description: 'Service description',
    example: '24/7 incident response support with SLA and tabletop exercises.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Public URL to the service',
    example: 'https://example.com/services/incident-response',
  })
  @IsUrl()
  @IsOptional()
  link?: string;
}
