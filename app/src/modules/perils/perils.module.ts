import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import {
  PerilsController,
  RiskCategoriesController,
} from './perils.controller';
import { PerilsService, RiskCategoriesService } from './perils.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PerilsController, RiskCategoriesController],
  providers: [PerilsService, RiskCategoriesService],
  exports: [PerilsService, RiskCategoriesService],
})
export class PerilsModule {}
