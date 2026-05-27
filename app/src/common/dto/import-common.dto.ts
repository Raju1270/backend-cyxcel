import { ApiProperty } from '@nestjs/swagger';
import { PreviewStatus } from '../utils/preview-status.enum';

export class WarningsDto {
  @ApiProperty({
    description: 'Excel row number (1-based, including header)',
    example: 5,
  })
  row: number;

  @ApiProperty({
    description: 'Sheet name where the warning occurred',
    example: 'cyber',
  })
  sheetName: string;

  @ApiProperty({
    type: [String],
    description: 'Array of warning messages',
    example: ["Column 'EU JANUARY 2025' not found", 'Peril not found'],
  })
  warnings: string[];

  @ApiProperty({
    enum: PreviewStatus,
    description:
      'Status of the item: NeedReview if there are warnings, Ready if no warnings',
    example: PreviewStatus.READY,
  })
  status: PreviewStatus;
}

export class InvalidItemDataDto {
  @ApiProperty({
    description: 'Excel row number (1-based, including header)',
    example: 18,
  })
  row: number;

  @ApiProperty({
    description: 'Sheet name where the invalid item was found',
    example: 'technology-itot',
  })
  sheetName: string;

  @ApiProperty({
    description: 'Error message explaining why the item is invalid',
    example:
      "Peril not found for title='Unmanaged external tech dependency' (slug='unmanaged-external-tech-dependency')",
  })
  error: string;
}

export class InvalidItemDto {
  @ApiProperty({
    description: 'All data from the Excel row',
    example: {
      'Risk Category': 'technology-itot',
      Title: 'Unmanaged external tech dependency',
      Description:
        "An unnoticed dependency on a deprecated application programming interface (API) from a third-party provider causes failure in the firm's customer portal when the API is decommissioned.",
      'Nature of loss':
        'Data Availability Loss, Financial Loss, Operational Loss, Reputational Loss',
      'Impact of Peril': 'MAJOR',
      'EU OCTOBER 2025': 'LIKELY',
      'US OCTOBER 2025': 'LIKELY',
      'UK OCTOBER 2025': 'LIKELY',
    },
  })
  rowData: Record<string, any>;

  @ApiProperty({ type: InvalidItemDataDto })
  _data: InvalidItemDataDto;
}

export class TotalsDto {
  @ApiProperty()
  all: number;

  @ApiProperty()
  need_review: number;

  @ApiProperty()
  ready: number;

  @ApiProperty()
  duplicate: number;

  @ApiProperty()
  invalid: number;
}
