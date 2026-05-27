import { ApiProperty } from '@nestjs/swagger';
import { Likelihood } from '../utils/likelihood.enum';
import { WarningsDto } from '../../../common/dto/import-common.dto';
import { ImportPreviewResponseDto } from '../../../common/dto/import-preview-response.dto';

export class PerilLikelihoodRowData {
  @ApiProperty()
  perilId: string;

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
