import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ThoughtLeadershipController } from './thought-leadership.controller';
import { ThoughtLeadershipService } from './thought-leadership.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ThoughtLeadershipController],
  providers: [ThoughtLeadershipService],
  exports: [ThoughtLeadershipService],
})
export class ThoughtLeadershipModule {}
