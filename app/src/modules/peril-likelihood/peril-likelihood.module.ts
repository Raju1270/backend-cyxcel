import { Module } from '@nestjs/common';
import { PerilLikelihoodController } from './peril-likelihood.controller';
import { PerilLikelihoodService } from './peril-likelihood.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ImportLogModule } from '../import-log/import-log.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, ImportLogModule, AuthModule],
  controllers: [PerilLikelihoodController],
  providers: [PerilLikelihoodService],
})
export class PerilLikelihoodModule {}
