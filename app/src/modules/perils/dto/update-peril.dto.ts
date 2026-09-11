import { ApiPropertyOptional } from '@nestjs/swagger';
import { Impact, Likelihood, Region } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
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
    description:
      'Severity rating for ratingMonth (or the current month by default). Must be provided together with euLikelihood, usLikelihood, and ukLikelihood - severity is recorded per month in the same PerilLikelihood row as the rest of the rating, not as an independent always-current value.',
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
    description: 'Nature of loss IDs to associate this peril with',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  natureOfLossIds?: string[];

  @ApiPropertyOptional({
    description: 'Sector IDs this peril affects',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  sectorIds?: string[];

  @ApiPropertyOptional({
    description:
      "Which month's rating this euLikelihood/usLikelihood/ukLikelihood triad is for, as YYYY-MM. Defaults to the current month if omitted. Must not be in the future. Lets an admin correct or backfill a past month's rating instead of always writing to the current month.",
    example: '2026-03',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'ratingMonth must be in YYYY-MM format',
  })
  ratingMonth?: string;

  @ApiPropertyOptional({
    description:
      'EU likelihood rating. Must be provided together with impact, usLikelihood, and ukLikelihood. Saving these creates/updates the PerilLikelihood record for ratingMonth (or the current month by default), archiving the previously-current rating to history the first time that month is written, mirroring the peril-likelihood Excel import.',
    enum: Likelihood,
  })
  @IsEnum(Likelihood)
  @IsOptional()
  euLikelihood?: Likelihood;

  @ApiPropertyOptional({
    description:
      'US likelihood rating. Must be provided together with impact, euLikelihood, and ukLikelihood.',
    enum: Likelihood,
  })
  @IsEnum(Likelihood)
  @IsOptional()
  usLikelihood?: Likelihood;

  @ApiPropertyOptional({
    description:
      'UK likelihood rating. Must be provided together with impact, euLikelihood, and usLikelihood.',
    enum: Likelihood,
  })
  @IsEnum(Likelihood)
  @IsOptional()
  ukLikelihood?: Likelihood;

  @ApiPropertyOptional({
    description:
      'Control question. Must be provided together with controlSource. Whitespace/line breaks are preserved as-is.',
    example:
      'Is multi-factor authentication enforced for all privileged accounts?',
  })
  @IsString()
  @IsOptional()
  controlQuestion?: string;

  @ApiPropertyOptional({
    description:
      'Source/reference for the control question. Must be provided together with controlQuestion.',
    example: 'ISO 27001 A.5.17',
  })
  @IsString()
  @IsOptional()
  controlSource?: string;
}
