import { ApiProperty } from '@nestjs/swagger';
import { TotalsDto } from './import-common.dto';
import { InvalidItemDto } from './import-common.dto';

export class ImportPreviewResponseDto<T = any> {
  @ApiProperty()
  month: string;

  @ApiProperty({ required: false })
  monthAsString?: string;

  @ApiProperty()
  year: string;

  @ApiProperty({ type: TotalsDto })
  totals: TotalsDto;

  @ApiProperty({ type: [Object] })
  data: T[];

  @ApiProperty({ type: [InvalidItemDto] })
  invalidItemsDetails: InvalidItemDto[];

  @ApiProperty({
    type: [String],
    description: 'Global warnings about missing sheets or required columns',
    example: [
      "Sheet 'ai-governance' not found in workbook",
      "Required column 'EU JANUARY 2025' not found in sheet 'cyber'",
    ],
    required: false,
  })
  warnings?: string[];
}
