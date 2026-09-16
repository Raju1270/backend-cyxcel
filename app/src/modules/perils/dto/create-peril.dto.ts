import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ControlQuestionType,
  ControlSubPartsStyle,
  Impact,
  Likelihood,
  Region,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ControlSubPartDto } from './control-sub-part.dto';

export class CreatePerilDto {
  @ApiProperty({
    description: 'Peril name',
    example: 'Ransomware',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Peril description',
    example: 'Malicious software that encrypts data and demands payment.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description:
      "Severity rating for the peril's first month. Must be provided together with euLikelihood, usLikelihood, and ukLikelihood - severity is recorded per month in the same PerilLikelihood row as the rest of the rating.",
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
      'EU likelihood rating. Must be provided together with usLikelihood and ukLikelihood.',
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

  @ApiPropertyOptional({
    description:
      'Control question format. SINGLE_LINE (default) is a plain question with one answer input. SECTION_WITH_SUBPARTS breaks the question into lettered sub-parts (see controlSubParts), each answered independently.',
    enum: ControlQuestionType,
  })
  @IsEnum(ControlQuestionType)
  @IsOptional()
  controlType?: ControlQuestionType;

  @ApiPropertyOptional({
    description:
      'Intro line shown below the main question before its sub-parts (e.g. "This entails practices such as:"). Only meaningful when controlType is SECTION_WITH_SUBPARTS.',
    example: 'This entails practices such as:',
  })
  @IsString()
  @IsOptional()
  controlIntroText?: string;

  @ApiPropertyOptional({
    description:
      'Sub-parts for a SECTION_WITH_SUBPARTS control question - each needs a key (e.g. "a") and its own text. Every sub-part is answered Yes/No/N-A on the user panel. Ignored when controlType is SINGLE_LINE.',
    type: [ControlSubPartDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ControlSubPartDto)
  @IsOptional()
  controlSubParts?: ControlSubPartDto[];

  @ApiPropertyOptional({
    description:
      'How controlSubParts are marked on the user panel: LETTERED shows "(a)", "(b)", ...; NUMBERED shows "1", "2", ...; BULLET shows a plain bullet for each. Defaults to LETTERED. Only meaningful when controlType is SECTION_WITH_SUBPARTS.',
    enum: ControlSubPartsStyle,
  })
  @IsEnum(ControlSubPartsStyle)
  @IsOptional()
  controlSubPartsStyle?: ControlSubPartsStyle;
}
