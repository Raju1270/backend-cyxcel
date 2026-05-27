import { ApiProperty } from '@nestjs/swagger';
import { WarningsDto } from '../../../common/dto/import-common.dto';
import { ImportPreviewResponseDto } from '../../../common/dto/import-preview-response.dto';

export class RiskOwnerRowData {
  @ApiProperty()
  title: string;

  @ApiProperty({ type: Date })
  createdAt: Date;
}

export class RiskOwnerPreviewItem {
  @ApiProperty({ type: RiskOwnerRowData })
  rowData: RiskOwnerRowData;

  @ApiProperty({ type: WarningsDto })
  _data: WarningsDto;
}

export class RiskOwnersImportPreviewResponseDto extends ImportPreviewResponseDto<RiskOwnerPreviewItem> {
  @ApiProperty({ type: [RiskOwnerPreviewItem] })
  declare data: RiskOwnerPreviewItem[];
}
