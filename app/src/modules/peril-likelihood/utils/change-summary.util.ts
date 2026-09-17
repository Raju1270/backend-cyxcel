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
  description: string;
  impact: string | null;
  control: { question: string; source: string } | null;
  natureOfLosses: { name: string }[];
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
 * eu/us/uk/impact are compared against `likelihoodBaseline` (the target
 * month's own row if it already exists, otherwise the most recent prior
 * month's row) since those are the only fields versioned per month.
 * description/control/nature of loss aren't month-versioned, so they're
 * always compared against the peril's current saved state.
 */
export function computePerilChangeSummary(
  existingPeril: ExistingPerilForDiff | null,
  likelihoodBaseline: LikelihoodForDiff | null,
  incoming: {
    eu: string;
    us: string;
    uk: string;
    impact?: string;
    description: string;
    control?: { question?: string; source?: string };
    natureOfLoss: string[];
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

  if (incoming.description) {
    const baselineDescription = existingPeril.description || null;
    if (baselineDescription !== incoming.description) {
      changes.push({
        field: 'Description',
        from: baselineDescription ?? NO_VALUE,
        to: incoming.description,
      });
    }
  }

  if (incoming.control?.question) {
    const baselineQuestion = existingPeril.control?.question || null;
    if (baselineQuestion !== incoming.control.question) {
      changes.push({
        field: 'Control',
        from: baselineQuestion ?? NO_VALUE,
        to: incoming.control.question,
      });
    }
  }
  if (incoming.control?.source) {
    const baselineSource = existingPeril.control?.source || null;
    if (baselineSource !== incoming.control.source) {
      changes.push({
        field: 'Source of Controls',
        from: baselineSource ?? NO_VALUE,
        to: incoming.control.source,
      });
    }
  }

  if (incoming.natureOfLoss.length > 0) {
    const baselineNames = new Set(
      (existingPeril.natureOfLosses ?? []).map((n) => n.name),
    );
    const incomingNames = new Set(incoming.natureOfLoss);
    const same =
      baselineNames.size === incomingNames.size &&
      Array.from(baselineNames).every((n) => incomingNames.has(n));
    if (!same) {
      changes.push({
        field: 'Nature of Loss',
        from: Array.from(baselineNames).join(', ') || NO_VALUE,
        to: Array.from(incomingNames).join(', ') || NO_VALUE,
      });
    }
  }

  return {
    changeType: changes.length > 0 ? 'UPDATED' : 'UNCHANGED',
    changes,
  };
}
