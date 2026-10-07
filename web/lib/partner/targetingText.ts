import { districtName, getGeoDistrict, stateName } from './indiaGeo';
import { AGE_BRACKETS } from './rules';
import type { OfferGeoRule, OfferTargeting } from './types';

/** "Karnataka" for a state code, "Bengaluru Urban (KA)" for a district id. */
export function geoName(codeOrId: string): string {
  const district = getGeoDistrict(codeOrId);
  return district ? `${district.name} (${district.stateCode})` : stateName(codeOrId);
}

export function ruleNames(rule: OfferGeoRule | undefined): string[] {
  if (!rule) return [];
  return [...(rule.states ?? []).map(stateName), ...(rule.districts ?? []).map((id) => geoName(id))];
}

/** "25-34" → "25–34" for display. */
export function formatAgeBracket(bracket: string): string {
  return bracket.replace('-', '–');
}

export function describeAges(targeting: OfferTargeting): string {
  const brackets = targeting.ageBrackets ?? [];
  if (brackets.length === 0 || brackets.length === AGE_BRACKETS.length) return 'All adults (18+)';
  return `Ages ${brackets.map(formatAgeBracket).join(', ')}`;
}

export function describeGender(targeting: OfferTargeting): string {
  if (targeting.gender === 'M') return 'Men';
  if (targeting.gender === 'F') return 'Women';
  return 'All genders';
}

/** One line for list rows, e.g. "Karnataka except Bengaluru Urban (KA) · All adults (18+)". */
export function summariseTargeting(targeting: OfferTargeting): string {
  const include = ruleNames(targeting.geo?.include);
  const exclude = ruleNames(targeting.geo?.exclude);
  let place = include.length === 0 ? 'All India' : include.length > 3 ? `${include.length} regions` : include.join(', ');
  if (exclude.length > 0) place += ` except ${exclude.length > 2 ? `${exclude.length} regions` : exclude.join(', ')}`;
  const people = [describeAges(targeting), targeting.gender && targeting.gender !== 'all' ? describeGender(targeting) : null]
    .filter(Boolean)
    .join(', ');
  return `${place} · ${people}`;
}

export { districtName, stateName };
