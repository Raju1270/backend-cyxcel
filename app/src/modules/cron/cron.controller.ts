import { Controller, Get, UseGuards } from '@nestjs/common';
import { CronAuthGuard } from '../../common/guards/cron-auth.guard';
import { CronService } from './cron.service';

@Controller('cron')
@UseGuards(CronAuthGuard)
export class CronController {
  constructor(private readonly cronService: CronService) {}

  // TRIGGERED MONTHLY BY VERCEL CRON (SEE vercel.json). READ-ONLY FOR NOW -
  // SEE CronService FOR WHY.
  @Get('carry-forward-likelihoods')
  async carryForwardLikelihoods() {
    return this.cronService.previewCarryForwardLikelihoods();
  }
}
