import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({
    description: 'Service title',
    example: 'Incident response retainer',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Provider name',
    example: 'Acme Cyber',
  })
  @IsString()
  @IsNotEmpty()
  providerName: string;

  @ApiProperty({
    description: 'Risk category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  riskCategoryId: string;

  @ApiProperty({
    description: 'Service description',
    example: '24/7 incident response support with SLA and tabletop exercises.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Public URL to the service',
    example: 'https://example.com/services/incident-response',
  })
  @IsUrl()
  @IsNotEmpty()
  link: string;
}
