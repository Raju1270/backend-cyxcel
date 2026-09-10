import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';

@Module({
  imports: [PrismaModule],
  controllers: [CronController],
  providers: [CronService],
})
export class CronModule {}
