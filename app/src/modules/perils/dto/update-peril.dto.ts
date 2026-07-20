import { ApiPropertyOptional } from '@nestjs/swagger';
import { Impact, Likelihood, Region } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdatePerilDto {
  @ApiPropertyOptional({
    description: 'Peril name',
    example: 'Ransomware',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Peril description',
    example: 'Malicious software that encrypts data and demands payment.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Impact rating',
    enum: Impact,
  })
  @IsEnum(Impact)
  @IsOptional()
  impact?: Impact;

  @ApiPropertyOptional({
    description: 'Regions this peril applies to',
    enum: Region,
    isArray: true,
  })
  @IsArray()
  @ArrayUnique()
  @IsEnum(Region, { each: true })
  @IsOptional()
  region?: Region[];

  @ApiPropertyOptional({
    description: 'Risk category IDs to associate this peril with',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  riskCategoryIds?: string[];

  @ApiPropertyOptional({
    description:
      'EU likelihood rating. Must be provided together with usLikelihood and ukLikelihood. Saving any of these creates a new dated likelihood record and archives the previous one to history, mirroring the peril-likelihood Excel import.',
    enum: Likelihood,
  })
  @IsEnum(Likelihood)
  @IsOptional()
  euLikelihood?: Likelihood;

  @ApiPropertyOptional({
    description:
      'US likelihood rating. Must be provided together with euLikelihood and ukLikelihood.',
    enum: Likelihood,
  })
  @IsEnum(Likelihood)
  @IsOptional()
  usLikelihood?: Likelihood;

  @ApiPropertyOptional({
    description:
      'UK likelihood rating. Must be provided together with euLikelihood and usLikelihood.',
    enum: Likelihood,
  })
  @IsEnum(Likelihood)
  @IsOptional()
  ukLikelihood?: Likelihood;
}
