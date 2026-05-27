import { Module } from '@nestjs/common';
import { PostmanController } from './postman.controller';
import { PostmanService } from './postman.service';
import { DevOnlyGuard } from '../../common/guards/dev-only.guard';

@Module({
  controllers: [PostmanController],
  providers: [PostmanService, DevOnlyGuard],
  exports: [PostmanService],
})
export class PostmanModule {}
