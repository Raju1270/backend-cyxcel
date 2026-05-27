import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ImportLogModule } from '../import-log/import-log.module';
import { AuthModule } from '../auth/auth.module';
import { ServicesCatalogController } from './services-catalog.controller';
import { ServicesCatalogService } from './services-catalog.service';

@Module({
  imports: [PrismaModule, ImportLogModule, AuthModule],
  controllers: [ServicesController, ServicesCatalogController],
  providers: [ServicesService, ServicesCatalogService],
  exports: [ServicesService, ServicesCatalogService],
})
export class ServicesModule {}
