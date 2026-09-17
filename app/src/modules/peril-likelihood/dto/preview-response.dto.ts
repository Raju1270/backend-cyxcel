import { ApiProperty } from '@nestjs/swagger';
import { Likelihood } from '../utils/likelihood.enum';
import { Impact } from '../utils/impact.enum';
import { TotalsDto, WarningsDto } from '../../../common/dto/import-common.dto';
import { ImportPreviewResponseDto } from '../../../common/dto/import-preview-response.dto';

export class PerilControlDto {
  @ApiProperty({ required: false })
  question?: string;

  @ApiProperty({ required: false })
  source?: string;
}

export class PerilFieldChangeDto {
  @ApiProperty({
    description: 'Name of the field that changed',
    example: 'EU',
  })
  field: string;

  @ApiProperty({
    description: "Value before this import, or '(none)' when there was none",
    example: 'Possible',
  })
  from: string;

  @ApiProperty({
    description: 'Value this import will save',
    example: 'Likely',
  })
  to: string;
}

export class PerilLikelihoodRowData {
  @ApiProperty({
    nullable: true,
    description:
      'Existing peril id, or null when the peril does not exist yet and will be created on import',
  })
  perilId: string | null;

  @ApiProperty()
  perilName: string;

  @ApiProperty()
  perilSlug: string;

  @ApiProperty({ enum: Likelihood })
  eu: Likelihood;

  @ApiProperty({ enum: Likelihood })
  us: Likelihood;

  @ApiProperty({ enum: Likelihood })
  uk: Likelihood;

  @ApiProperty({
    description:
      'True when this peril was not found and will be created on import',
  })
  isNewPeril: boolean;

  @ApiProperty({
    description:
      'True when this peril already has data saved for the target month - importing will overwrite the existing eu/us/uk values',
  })
  hasExistingMonthData: boolean;

  @ApiProperty({
    description:
      'Peril description read from the "Description" column - only used when creating a new peril',
  })
  description: string;

  @ApiProperty({
    enum: Impact,
    required: false,
    nullable: true,
    description:
      'Peril impact read from the "Impact of Peril" / "Impact" column. Used both when creating a new peril and, since severity is now recorded per PerilLikelihood month like eu/us/uk, when importing/correcting an existing month\'s row - falls back to the peril\'s current impact when this column is blank.',
  })
  impact?: Impact | null;

  @ApiProperty({
    type: [String],
    description:
      'Nature of loss names read from the "Nature of loss" column that matched an existing NatureOfLoss record by name - these get connected to the peril on import. Names in the sheet that did not match any existing record are dropped here and surfaced as a warning instead.',
  })
  natureOfLoss: string[];

  @ApiProperty({
    type: PerilControlDto,
    required: false,
    nullable: true,
    description:
      'Control question/source read from the "Control" / "Source of Controls" columns. When either is present, the peril\'s Control record is created or updated on import; fields left blank are not overwritten.',
  })
  control?: PerilControlDto | null;

  @ApiProperty({
    enum: ['NEW', 'UPDATED', 'UNCHANGED'],
    description:
      "NEW: this peril doesn't exist yet and will be created. UPDATED: the peril exists and at least one field (eu/us/uk/impact vs its current or most recent prior month, or description/control/nature of loss vs its current values) differs from this row. UNCHANGED: the peril exists and every field in this row matches what's already saved.",
  })
  changeType: 'NEW' | 'UPDATED' | 'UNCHANGED';

  @ApiProperty({
    type: [PerilFieldChangeDto],
    description:
      'Field-level diff explaining what UPDATED changed, in the same order the fields are checked. Empty for NEW (nothing to compare) and UNCHANGED rows.',
  })
  changes: PerilFieldChangeDto[];
}

export class PerilLikelihoodPreviewItem {
  @ApiProperty({ type: PerilLikelihoodRowData })
  rowData: PerilLikelihoodRowData;

  @ApiProperty({ type: WarningsDto })
  _data: WarningsDto;
}

export class PerilLikelihoodTotalsDto extends TotalsDto {
  @ApiProperty({ description: 'Rows that will create a brand-new peril' })
  newPerils: number;

  @ApiProperty({
    description:
      "Rows for an existing peril where at least one field actually differs from what's currently saved",
  })
  updatedPerils: number;

  @ApiProperty({
    description:
      "Rows for an existing peril where every field already matches what's currently saved - importing this row is a no-op",
  })
  unchangedPerils: number;
}

export class PerilLikelihoodImportPreviewResponseDto extends ImportPreviewResponseDto<PerilLikelihoodPreviewItem> {
  @ApiProperty({ type: [PerilLikelihoodPreviewItem] })
  declare data: PerilLikelihoodPreviewItem[];

  @ApiProperty({ type: PerilLikelihoodTotalsDto })
  declare totals: PerilLikelihoodTotalsDto;
}
