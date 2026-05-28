import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly isVercelRuntime = Boolean(process.env.VERCEL);

  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('database.url');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super(
      databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined,
    );
  }

  async onModuleInit() {
    if (this.isVercelRuntime) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.$connect();
  }

  async onModuleDestroy() {
    if (this.isVercelRuntime) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.$disconnect();
  }
}
