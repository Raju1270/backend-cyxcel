import { ApiProperty } from '@nestjs/swagger';
import { Likelihood } from '../utils/likelihood.enum';
import { Impact } from '../utils/impact.enum';
import { WarningsDto } from '../../../common/dto/import-common.dto';
import { ImportPreviewResponseDto } from '../../../common/dto/import-preview-response.dto';

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
      'Peril impact read from the "Impact of Peril" / "Impact" column - only used when creating a new peril',
  })
  impact?: Impact | null;
}

export class PerilLikelihoodPreviewItem {
  @ApiProperty({ type: PerilLikelihoodRowData })
  rowData: PerilLikelihoodRowData;

  @ApiProperty({ type: WarningsDto })
  _data: WarningsDto;
}

export class PerilLikelihoodImportPreviewResponseDto extends ImportPreviewResponseDto<PerilLikelihoodPreviewItem> {
  @ApiProperty({ type: [PerilLikelihoodPreviewItem] })
  declare data: PerilLikelihoodPreviewItem[];
}
