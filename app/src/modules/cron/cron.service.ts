import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getCurrentMonthSnapshotDate } from '../../common/utils/peril-likelihood-date.util';

export interface CarryForwardCandidate {
  perilId: string;
  name: string;
  from: string;
  eu: string;
  us: string;
  uk: string;
}

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // READ-ONLY: REPORTS WHAT A MONTHLY CARRY-FORWARD WOULD DO WITHOUT WRITING
  // ANYTHING. THE ACTUAL insert/upsert IS DELIBERATELY NOT IMPLEMENTED YET -
  // ENABLE IT ONLY AFTER REVIEWING THIS REPORT ACROSS A REAL MONTH BOUNDARY.
  async previewCarryForwardLikelihoods() {
    const snapshotDate = getCurrentMonthSnapshotDate();

    const perils = await this.prisma.peril.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });

    const currentMonthRows = await this.prisma.perilLikelihood.findMany({
      where: { createdAt: snapshotDate },
      select: { perilId: true },
    });
    const hasCurrentMonth = new Set(currentMonthRows.map((r) => r.perilId));

    const latestByPerilId = await this.prisma.perilLikelihood.findMany({
      where: { perilId: { in: perils.map((p) => p.id) } },
      orderBy: { createdAt: 'desc' },
      distinct: ['perilId'],
      select: { perilId: true, eu: true, us: true, uk: true, createdAt: true },
    });
    const latestMap = new Map(latestByPerilId.map((l) => [l.perilId, l]));

    const alreadyUpToDate: string[] = [];
    const wouldCarryForward: CarryForwardCandidate[] = [];
    const noPriorRating: string[] = [];

    for (const peril of perils) {
      if (hasCurrentMonth.has(peril.id)) {
        alreadyUpToDate.push(peril.name);
        continue;
      }

      const latest = latestMap.get(peril.id);
      if (!latest) {
        // NOTHING TO CARRY FORWARD (E.G. A BRAND-NEW, NOT-YET-RATED PERIL).
        noPriorRating.push(peril.name);
        continue;
      }

      wouldCarryForward.push({
        perilId: peril.id,
        name: peril.name,
        from: latest.createdAt.toISOString().slice(0, 10),
        eu: latest.eu,
        us: latest.us,
        uk: latest.uk,
      });
    }

    const summary = {
      snapshotDate: snapshotDate.toISOString().slice(0, 10),
      totalPerils: perils.length,
      alreadyUpToDate: alreadyUpToDate.length,
      wouldCarryForward: wouldCarryForward.length,
      noPriorRating: noPriorRating.length,
    };

    this.logger.log(
      `Carry-forward preview for ${summary.snapshotDate}: ${JSON.stringify(summary)}`,
    );

    return { ...summary, wouldCarryForward, noPriorRating };
  }
}
