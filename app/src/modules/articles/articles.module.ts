import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ImportLogModule } from '../import-log/import-log.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, ImportLogModule, AuthModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
