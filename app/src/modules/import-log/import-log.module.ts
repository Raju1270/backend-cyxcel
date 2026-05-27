import { Module } from '@nestjs/common';
import { ImportLogService } from './import-log.service';
import { ImportLogController } from './import-log.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ImportLogController],
  providers: [ImportLogService],
  exports: [ImportLogService],
})
export class ImportLogModule {}
