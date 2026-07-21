import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import {
  NatureOfLossController,
  PerilsController,
  RiskCategoriesController,
} from './perils.controller';
import {
  NatureOfLossService,
  PerilsService,
  RiskCategoriesService,
} from './perils.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    PerilsController,
    RiskCategoriesController,
    NatureOfLossController,
  ],
  providers: [PerilsService, RiskCategoriesService, NatureOfLossService],
  exports: [PerilsService, RiskCategoriesService, NatureOfLossService],
})
export class PerilsModule {}
