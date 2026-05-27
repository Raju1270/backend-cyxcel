import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RootService {
  constructor(private readonly configService: ConfigService) {}

  getVersion(): string {
    return this.configService.get<string>('app.version', '0.0.0');
  }
}
