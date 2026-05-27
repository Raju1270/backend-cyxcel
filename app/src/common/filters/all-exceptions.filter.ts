import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request: any = (ctx as any).getRequest?.() ?? undefined;

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = isHttp
      ? (exception.getResponse() as any)
      : { message: (exception as Error)?.message ?? 'Internal server error' };

    const isPlainObject = (val: unknown): val is Record<string, unknown> =>
      !!val && typeof val === 'object' && !Array.isArray(val);
    const isFieldErrorMap = (val: unknown): val is Record<string, string[]> =>
      isPlainObject(val) &&
      !('statusCode' in val) &&
      !('error' in val) &&
      !('message' in val) &&
      Object.values(val).every((v) => Array.isArray(v));

    let messageField: any;
    if (isFieldErrorMap(raw)) {
      messageField = raw;
    } else if (isFieldErrorMap(raw?.message)) {
      messageField = raw.message;
    } else if (Array.isArray(raw)) {
      messageField = raw;
    } else if (Array.isArray(raw?.message)) {
      messageField = raw.message;
    } else if (typeof raw?.message === 'string') {
      messageField = [raw.message];
    } else if (typeof raw === 'string') {
      messageField = [raw];
    } else {
      messageField = ['Bad Request'];
    }

    const errorName = raw?.error ?? HttpStatus[status] ?? 'Error';

    // Log the exception details
    if (isPlainObject(messageField)) {
      this.logger.error(
        `HTTP ${status} ${errorName}: ${JSON.stringify(messageField)}`,
        (exception as any)?.stack ?? undefined,
      );
    } else {
      this.logger.error(
        `HTTP ${status} ${errorName}: ${messageField.join(', ')}`,
        (exception as any)?.stack ?? undefined,
      );
    }

    // Return message field as-is (no i18n translation)
    const translatedMessageField = messageField;

    response.status(status).json({
      statusCode: status,
      error: errorName,
      message: translatedMessageField,
    });
  }
}
