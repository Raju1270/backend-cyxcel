import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const startAtMs = Date.now();
    const method = request.method;
    const url = (request.originalUrl ?? request.url) || '';
    const ip =
      request.ip ??
      (request.socket ? (request.socket as any).remoteAddress : undefined);

    return next.handle().pipe(
      finalize(() => {
        const status = response.statusCode;
        const durationMs = Date.now() - startAtMs;
        this.logger.log(
          `${method} ${url} ${status} - ${durationMs}ms${ip ? ` - ${ip}` : ''}`,
        );
      }),
    );
  }
}
