import { Impact } from './impact.enum';

export function parseImpact(value: unknown): Impact | undefined {
  if (value === null || value === undefined) return undefined;

  // Handle empty strings explicitly
  if (typeof value === 'string' && value.trim() === '') return undefined;

  // Handle numeric values directly (Excel might return numbers)
  if (typeof value === 'number') {
    if (value === 1 || value === 1.0) return Impact.MINOR;
    if (value === 2 || value === 2.0) return Impact.MODERATE;
    if (value === 3 || value === 3.0) return Impact.MAJOR;
    if (value === 4 || value === 4.0) return Impact.SEVERE;
    if (value === 5 || value === 5.0) return Impact.CRITICAL;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }

  const raw = String(value).trim().toLowerCase();

  // Handle empty string after conversion
  if (raw === '') return undefined;

  // Reason: Support both textual labels and numeric scale (1-5)
  if (['1', '1.0'].includes(raw)) return Impact.MINOR;
  if (['2', '2.0'].includes(raw)) return Impact.MODERATE;
  if (['3', '3.0'].includes(raw)) return Impact.MAJOR;
  if (['4', '4.0'].includes(raw)) return Impact.SEVERE;
  if (['5', '5.0'].includes(raw)) return Impact.CRITICAL;

  if (raw.includes('minor')) return Impact.MINOR;
  if (raw.includes('moderate')) return Impact.MODERATE;
  if (raw.includes('major')) return Impact.MAJOR;
  if (raw.includes('severe')) return Impact.SEVERE;
  if (raw.includes('critical')) return Impact.CRITICAL;

  return undefined;
}
