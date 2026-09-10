import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// VERCEL CRON SENDS `Authorization: Bearer <CRON_SECRET>` ON EVERY SCHEDULED
// HIT. THE ROUTE'S PATH IS OTHERWISE A PLAIN PUBLIC URL, SO THIS IS WHAT STOPS
// ANYONE ELSE FROM TRIGGERING IT.
@Injectable()
export class CronAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.configService.get<string>('cron.secret');
    if (!secret) {
      throw new UnauthorizedException('CRON_SECRET is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (header !== `Bearer ${secret}`) {
      throw new UnauthorizedException('Invalid or missing cron secret');
    }

    return true;
  }
}
