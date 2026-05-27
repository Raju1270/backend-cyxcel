import { applyDecorators } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiBodyOptions,
} from '@nestjs/swagger';
import { PreviewStatus } from '../utils/preview-status.enum';

/**
 * Decorator to set API tag for a controller
 */
export function ApiTag(tag: string) {
  return ApiTags(tag);
}

/**
 * Options for file upload body schema
 */
export interface FileUploadBodyOptions {
  /** Module name for file description (e.g., 'articles', 'risk-owners') */
  moduleName: string;
  /** Whether CSV files are allowed */
  allowCsv?: boolean;
  /** Whether month/year fields are required */
  requireMonthYear?: boolean;
  /** Whether status field should be included */
  includeStatus?: boolean;
  /** Additional properties to add to the schema */
  additionalProperties?: Record<string, any>;
}

/**
 * Creates ApiBody schema for file upload endpoints
 */
function createFileUploadBodySchema(
  options: FileUploadBodyOptions,
): ApiBodyOptions {
  const {
    moduleName,
    allowCsv,
    requireMonthYear,
    includeStatus,
    additionalProperties,
  } = options;

  const fileDescription = allowCsv
    ? `Excel file (.xlsx, .xls) or CSV file (.csv) containing ${moduleName} data`
    : `Excel file (.xlsx, .xls) containing ${moduleName} data`;

  const properties: Record<string, any> = {
    input_file: {
      type: 'string',
      format: 'binary',
      description: fileDescription,
    },
    ...additionalProperties,
  };

  const required: string[] = ['input_file'];

  if (requireMonthYear) {
    properties.month = {
      type: 'string',
      description: 'Month as a string (01-12)',
      example: '01',
    };
    properties.year = {
      type: 'string',
      description: 'Year as a string (e.g., 2025)',
      example: '2025',
    };
    required.push('month', 'year');
  }

  if (includeStatus) {
    properties.status = {
      type: 'array',
      items: {
        type: 'string',
        enum: [PreviewStatus.READY, PreviewStatus.NEED_REVIEW],
      },
      description:
        'Array of statuses to import. Allowed values: Ready, NeedReview. Default: [Ready]. DUPLICATE status is never imported.',
      example: [PreviewStatus.READY],
    };
  }

  return {
    schema: {
      type: 'object',
      properties,
      required,
    },
  };
}

/**
 * Decorator for validate endpoint
 */
export function ApiValidateOperation(moduleName: string, allowCsv = true) {
  return applyDecorators(
    ApiOperation({
      summary: `Validate and preview ${moduleName} import data`,
      description: `Uploads an Excel file (.xlsx, .xls)${
        allowCsv ? ' or CSV file (.csv)' : ''
      } and validates the data. Returns preview of all data that would be imported without actually inserting into the database.`,
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody(createFileUploadBodySchema({ moduleName, allowCsv })),
  );
}

/**
 * Decorator for validate endpoint with month/year
 */
export function ApiValidateOperationWithDate(
  moduleName: string,
  allowCsv = true,
) {
  return applyDecorators(
    ApiOperation({
      summary: `Validate and preview ${moduleName} import data`,
      description: `Uploads an Excel file (.xlsx, .xls)${
        allowCsv ? ' or CSV file (.csv)' : ''
      } and validates the data. Returns preview of all data that would be imported without actually inserting into the database.`,
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody(
      createFileUploadBodySchema({
        moduleName,
        allowCsv,
        requireMonthYear: true,
      }),
    ),
  );
}

/**
 * Decorator for import endpoint
 */
export function ApiImportOperation(moduleName: string, allowCsv = true) {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: `Import ${moduleName} data into database`,
      description: `Uploads an Excel file (.xlsx, .xls)${
        allowCsv ? ' or CSV file (.csv)' : ''
      } and imports the data into the database. Data should be validated first using the validate endpoint. Requires authentication.`,
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody(
      createFileUploadBodySchema({
        moduleName,
        allowCsv,
        includeStatus: true,
      }),
    ),
  );
}

/**
 * Decorator for import endpoint with month/year
 */
export function ApiImportOperationWithDate(
  moduleName: string,
  allowCsv = true,
) {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: `Import ${moduleName} data into database`,
      description: `Uploads an Excel file (.xlsx, .xls)${
        allowCsv ? ' or CSV file (.csv)' : ''
      } and imports the data into the database. Data should be validated first using the validate endpoint. Requires authentication.`,
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody(
      createFileUploadBodySchema({
        moduleName,
        allowCsv,
        requireMonthYear: true,
        includeStatus: true,
      }),
    ),
  );
}

/**
 * Decorator for download-with-highlights endpoint
 */
export function ApiDownloadHighlightsOperation(
  moduleName: string,
  allowCsv = true,
) {
  const csvNote = allowCsv ? ' CSV files are converted to Excel format.' : '';
  return applyDecorators(
    ApiOperation({
      summary: 'Download Excel file with highlighted errors',
      description: `Uploads an Excel file (.xlsx, .xls)${
        allowCsv ? ' or CSV file (.csv)' : ''
      }, validates it, and returns an Excel file with highlighted rows: red border for DUPLICATE rows, orange border for NeedReview rows. Error messages are added as cell comments.${csvNote}`,
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody(createFileUploadBodySchema({ moduleName, allowCsv })),
  );
}

/**
 * Decorator for download-with-highlights endpoint with month/year
 */
export function ApiDownloadHighlightsOperationWithDate(
  moduleName: string,
  allowCsv = true,
) {
  const csvNote = allowCsv ? ' CSV files are converted to Excel format.' : '';
  return applyDecorators(
    ApiOperation({
      summary: 'Download Excel file with highlighted errors',
      description: `Uploads an Excel file (.xlsx, .xls)${
        allowCsv ? ' or CSV file (.csv)' : ''
      }, validates it, and returns an Excel file with highlighted rows: red border for DUPLICATE rows, orange border for NeedReview rows. Error messages are added as cell comments.${csvNote}`,
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody(
      createFileUploadBodySchema({
        moduleName,
        allowCsv,
        requireMonthYear: true,
      }),
    ),
  );
}
