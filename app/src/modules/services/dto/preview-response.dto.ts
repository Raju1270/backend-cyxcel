import { ApiProperty } from '@nestjs/swagger';
import { WarningsDto } from '../../../common/dto/import-common.dto';
import { ImportPreviewResponseDto } from '../../../common/dto/import-preview-response.dto';

export class ServiceRowData {
  @ApiProperty()
  title: string;

  @ApiProperty()
  link: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  providerName: string;

  @ApiProperty()
  riskCategoryId: string;

  @ApiProperty()
  riskCategorySlug: string;

  @ApiProperty()
  riskCategoryName: string;

  @ApiProperty()
  createdAt: Date;
}

export class ServicePreviewItem {
  @ApiProperty({ type: ServiceRowData })
  rowData: ServiceRowData;

  @ApiProperty({ type: WarningsDto })
  _data: WarningsDto;
}

export class ServicesImportPreviewResponseDto extends ImportPreviewResponseDto<ServicePreviewItem> {
  @ApiProperty({ type: [ServicePreviewItem] })
  declare data: ServicePreviewItem[];
}
