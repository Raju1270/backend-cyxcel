export interface PerilFieldChange {
  field: string;
  from: string;
  to: string;
}

export interface PerilChangeSummary {
  changeType: 'NEW' | 'UPDATED' | 'UNCHANGED';
  changes: PerilFieldChange[];
}

export interface ExistingPerilForDiff {
  impact: string | null;
}

export interface LikelihoodForDiff {
  eu: string;
  us: string;
  uk: string;
  impact: string;
}

const NO_VALUE = '(none)';

/**
 * Compares an incoming row against what's already saved so the preview can
 * tell an admin exactly what a row will change - the point of the "download
 * previous month, edit, re-upload" workflow is to only touch what's actually
 * different, and this makes that visible before import.
 *
 * Only impact and the EU/US/UK likelihoods are importable, and all four are
 * versioned per month, so they're compared against `likelihoodBaseline` (the
 * target month's own row if it already exists, otherwise the most recent
 * prior month's row).
 */
export function computePerilChangeSummary(
  existingPeril: ExistingPerilForDiff | null,
  likelihoodBaseline: LikelihoodForDiff | null,
  incoming: {
    eu: string;
    us: string;
    uk: string;
    impact?: string;
  },
): PerilChangeSummary {
  if (!existingPeril) {
    return { changeType: 'NEW', changes: [] };
  }

  const changes: PerilFieldChange[] = [];

  const baselineEu = likelihoodBaseline?.eu ?? null;
  if (baselineEu !== incoming.eu) {
    changes.push({
      field: 'EU',
      from: baselineEu ?? NO_VALUE,
      to: incoming.eu,
    });
  }
  const baselineUs = likelihoodBaseline?.us ?? null;
  if (baselineUs !== incoming.us) {
    changes.push({
      field: 'US',
      from: baselineUs ?? NO_VALUE,
      to: incoming.us,
    });
  }
  const baselineUk = likelihoodBaseline?.uk ?? null;
  if (baselineUk !== incoming.uk) {
    changes.push({
      field: 'UK',
      from: baselineUk ?? NO_VALUE,
      to: incoming.uk,
    });
  }

  if (incoming.impact) {
    const baselineImpact =
      likelihoodBaseline?.impact ?? existingPeril.impact ?? null;
    if (baselineImpact !== incoming.impact) {
      changes.push({
        field: 'Impact',
        from: baselineImpact ?? NO_VALUE,
        to: incoming.impact,
      });
    }
  }

  return {
    changeType: changes.length > 0 ? 'UPDATED' : 'UNCHANGED',
    changes,
  };
}
