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
import { ServicesService } from './services.service';
import { ServicesImportPreviewResponseDto } from './dto/preview-response.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { validateFile } from '../../common/validators/file.validator';
import { parseAndValidateStatuses } from '../../common/validators/status.validator';
import { extractUserIdFromRequest } from '../../common/validators/user.validator';
import { validateMonthAndYear } from '../../common/validators/date.validator';
import { ClerkAuthGuard } from '../auth';

@ApiTag('services')
@Controller('services')
@UseGuards(ClerkAuthGuard)
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('validate')
  @UseInterceptors(FileInterceptor('input_file'))
  @ApiValidateOperationWithDate('services', true)
  async validate(
    @UploadedFile() file: Express.Multer.File,
    @Body('month') month: string,
    @Body('year') year: string,
  ): Promise<ServicesImportPreviewResponseDto> {
    validateFile(file, { allowCsv: true });
    validateMonthAndYear(month, year);

    return this.servicesService.validateAndPreview(
      file.buffer,
      month,
      year,
      file.originalname,
    );
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('input_file'))
  @ApiImportOperationWithDate('services', true)
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Body('month') month: string,
    @Body('year') year: string,
    @Body('status') status?: string | string[],
    @Req() request?: Request,
  ): Promise<{ message: string; imported: number; actualImported?: number }> {
    validateFile(file, { allowCsv: true });
    validateMonthAndYear(month, year);

    const allowedStatuses = parseAndValidateStatuses(status);
    const userId = await extractUserIdFromRequest(request, this.prisma);
    const filename = file.originalname || 'unknown.xlsx';

    return this.servicesService.importData(
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
  @ApiDownloadHighlightsOperationWithDate('services', true)
  async downloadWithHighlights(
    @UploadedFile() file: Express.Multer.File,
    @Body('month') month: string,
    @Body('year') year: string,
    @Res() res: Response,
  ): Promise<void> {
    validateFile(file, { allowCsv: true });
    validateMonthAndYear(month, year);

    const highlightedBuffer =
      await this.servicesService.downloadExcelWithHighlights(
        file.buffer,
        month,
        year,
        file.originalname,
      );

    const originalFilename = file.originalname || 'services.xlsx';
    const downloadFilename = originalFilename.replace(
      /\.(xlsx|xls|csv)$/i,
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
