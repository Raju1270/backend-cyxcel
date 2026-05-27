import { Likelihood } from './likelihood.enum';

export function parseLikelihood(value: unknown): Likelihood | undefined {
  if (value === null || value === undefined) return undefined;

  // Handle empty strings explicitly
  if (typeof value === 'string' && value.trim() === '') return undefined;

  // Handle numeric values directly (Excel might return numbers)
  if (typeof value === 'number') {
    if (value === 1 || value === 1.0) return Likelihood.HIGHLY_UNLIKELY;
    if (value === 2 || value === 2.0) return Likelihood.UNLIKELY;
    if (value === 3 || value === 3.0) return Likelihood.POSSIBLE;
    if (value === 4 || value === 4.0) return Likelihood.LIKELY;
    if (value === 5 || value === 5.0) return Likelihood.HIGHLY_LIKELY;
  }

  const raw = String(value).trim().toLowerCase();

  // Handle empty string after conversion
  if (raw === '') return undefined;

  // Reason: Support both textual labels and numeric scale (1-5)
  if (['1', '1.0'].includes(raw)) return Likelihood.HIGHLY_UNLIKELY;
  if (['2', '2.0'].includes(raw)) return Likelihood.UNLIKELY;
  if (['3', '3.0'].includes(raw)) return Likelihood.POSSIBLE;
  if (['4', '4.0'].includes(raw)) return Likelihood.LIKELY;
  if (['5', '5.0'].includes(raw)) return Likelihood.HIGHLY_LIKELY;

  if (raw.includes('highly unlikely')) return Likelihood.HIGHLY_UNLIKELY;
  if (raw.includes('highly likely')) return Likelihood.HIGHLY_LIKELY;
  if (raw.includes('unlikely')) return Likelihood.UNLIKELY;
  if (raw.includes('possible')) return Likelihood.POSSIBLE;
  if (raw.includes('likely')) return Likelihood.LIKELY;

  return undefined;
}
