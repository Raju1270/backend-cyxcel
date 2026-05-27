import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express, Request } from 'express';
import 'multer';
import {
  ApiTag,
  ApiValidateOperationWithDate,
  ApiImportOperationWithDate,
  ApiDownloadHighlightsOperationWithDate,
} from '../../common/decorators/swagger.decorators';
import { PerilLikelihoodService } from './peril-likelihood.service';
import { PerilLikelihoodImportPreviewResponseDto } from './dto/preview-response.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { validateFile } from '../../common/validators/file.validator';
import { parseAndValidateStatuses } from '../../common/validators/status.validator';
import { extractUserIdFromRequest } from '../../common/validators/user.validator';
import { validateMonthAndYear } from '../../common/validators/date.validator';
import { ClerkAuthGuard } from '../auth';

@ApiTag('peril-likelihood')
@Controller('peril-likelihood')
@UseGuards(ClerkAuthGuard)
export class PerilLikelihoodController {
  constructor(
    private readonly perilLikelihoodService: PerilLikelihoodService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('validate')
  @UseInterceptors(FileInterceptor('input_file'))
  @ApiValidateOperationWithDate('peril likelihood', false)
  async validate(
    @UploadedFile() file: Express.Multer.File,
    @Body('month') month: string,
    @Body('year') year: string,
  ): Promise<PerilLikelihoodImportPreviewResponseDto> {
    validateFile(file, { allowCsv: false });
    validateMonthAndYear(month, year);

    return this.perilLikelihoodService.validateAndPreview(
      file.buffer,
      month,
      year,
    );
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('input_file'))
  @ApiImportOperationWithDate('peril likelihood', false)
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Body('month') month: string,
    @Body('year') year: string,
    @Body('status') status?: string | string[],
    @Req() request?: Request,
  ): Promise<{ message: string; imported: number; actualImported?: number }> {
    validateFile(file, { allowCsv: false });
    validateMonthAndYear(month, year);

    const allowedStatuses = parseAndValidateStatuses(status);
    const userId = await extractUserIdFromRequest(request, this.prisma);
    const filename = file.originalname || 'unknown.xlsx';

    return this.perilLikelihoodService.importData(
      file.buffer,
      month,
      year,
      allowedStatuses,
      userId,
      filename,
    );
  }

  @Post('download-with-highlights')
  @UseInterceptors(FileInterceptor('input_file'))
  @ApiDownloadHighlightsOperationWithDate('peril likelihood', false)
  async downloadWithHighlights(
    @UploadedFile() file: Express.Multer.File,
    @Body('month') month: string,
    @Body('year') year: string,
    @Res() res: Response,
  ): Promise<void> {
    validateFile(file, { allowCsv: false });
    validateMonthAndYear(month, year);

    const highlightedBuffer =
      await this.perilLikelihoodService.downloadExcelWithHighlights(
        file.buffer,
        month,
        year,
      );

    const originalFilename = file.originalname || 'peril-likelihood.xlsx';
    const downloadFilename = originalFilename.replace(
      /\.(xlsx|xls)$/i,
      '-highlighted.xlsx',
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadFilename}"`,
    );
    res.send(highlightedBuffer);
  }
}
