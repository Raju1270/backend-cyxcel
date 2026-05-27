import { ApiProperty } from '@nestjs/swagger';
import { WarningsDto } from '../../../common/dto/import-common.dto';
import { ImportPreviewResponseDto } from '../../../common/dto/import-preview-response.dto';

export class ArticleRowData {
  @ApiProperty()
  title: string;

  @ApiProperty()
  link: string;

  @ApiProperty()
  publishedDate: string;

  @ApiProperty()
  riskCategoryId: string;

  @ApiProperty()
  riskCategorySlug: string;

  @ApiProperty()
  riskCategoryName: string;
}

export class ArticlePreviewItem {
  @ApiProperty({ type: ArticleRowData })
  rowData: ArticleRowData;

  @ApiProperty({ type: WarningsDto })
  _data: WarningsDto;
}

export class ArticlesImportPreviewResponseDto extends ImportPreviewResponseDto<ArticlePreviewItem> {
  @ApiProperty({ type: [ArticlePreviewItem] })
  declare data: ArticlePreviewItem[];
}
