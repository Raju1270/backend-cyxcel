import { Module } from '@nestjs/common';
import { RiskOwnersController } from './risk-owners.controller';
import { RiskOwnersService } from './risk-owners.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ImportLogModule } from '../import-log/import-log.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, ImportLogModule, AuthModule],
  controllers: [RiskOwnersController],
  providers: [RiskOwnersService],
})
export class RiskOwnersModule {}
