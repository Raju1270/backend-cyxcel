import { ApiProperty } from '@nestjs/swagger';
import { WarningsDto } from '../../../common/dto/import-common.dto';
import { ImportPreviewResponseDto } from '../../../common/dto/import-preview-response.dto';

export class RiskCategoryRowData {
  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  lossData: any;

  @ApiProperty()
  createdAt: Date;
}

export class RiskCategoryPreviewItem {
  @ApiProperty({ type: RiskCategoryRowData })
  rowData: RiskCategoryRowData;

  @ApiProperty({ type: WarningsDto })
  _data: WarningsDto;
}

export class RiskCategoriesImportPreviewResponseDto extends ImportPreviewResponseDto<RiskCategoryPreviewItem> {
  @ApiProperty({ type: [RiskCategoryPreviewItem] })
  declare data: RiskCategoryPreviewItem[];
}
