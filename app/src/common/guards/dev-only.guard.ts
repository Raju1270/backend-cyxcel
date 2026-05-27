import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DevOnlyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const nodeEnv = this.configService.get<string>('app.env') ?? 'production';
    const isProduction = nodeEnv === 'production';

    if (isProduction) {
      throw new ForbiddenException(
        'This endpoint is only available in development environment',
      );
    }

    return true;
  }
}
