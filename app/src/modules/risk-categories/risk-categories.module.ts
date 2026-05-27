import { Module } from '@nestjs/common';
import { RiskCategoriesController } from './risk-categories.controller';
import { RiskCategoriesService } from './risk-categories.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ImportLogModule } from '../import-log/import-log.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, ImportLogModule, AuthModule],
  controllers: [RiskCategoriesController],
  providers: [RiskCategoriesService],
})
export class RiskCategoriesModule {}
