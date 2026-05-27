import { RiskCategorySlugs } from '../../../common/utils/risk-category-slugs.enum';

/**
 * Mapping from Excel Risk Vertical values to RiskCategory slugs
 */
const RISK_VERTICAL_TO_SLUG_MAP: Record<string, RiskCategorySlugs> = {
  AI: RiskCategorySlugs.AI,
  'Corporate Governance': RiskCategorySlugs.CORPORATE,
  Cyber: RiskCategorySlugs.CYBER,
  Geopolitics: RiskCategorySlugs.GEOPOLITICAL,
  'Laws & Regulations': RiskCategorySlugs.LEGAL,
  'Supply Chain': RiskCategorySlugs.SUPPLY_CHAIN,
  Tech: RiskCategorySlugs.TECHNOLOGY,
};

/**
 * Get RiskCategory slug from Risk Vertical value
 * First checks if the value is already a slug (for CSV files)
 * If not found, uses mapping from Excel format (for Excel files)
 */
export function getRiskCategorySlug(
  riskVertical: string,
  riskCategoryMap?: Map<string, { slug: string }>,
): string | null {
  if (!riskVertical) return null;

  const normalized = riskVertical.trim();
  if (!normalized) return null;

  // First, check if the value is already a slug (for CSV files)
  // This allows CSV files to use slug values directly without mapping
  if (riskCategoryMap) {
    const directSlug = riskCategoryMap.get(normalized);
    if (directSlug) {
      return normalized;
    }
  }

  // If not found as slug, try mapping from Excel format
  return RISK_VERTICAL_TO_SLUG_MAP[normalized] || null;
}
