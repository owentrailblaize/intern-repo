/**
 * Fallback mapping: school (organization) name → conference when deal.conference is not set.
 * Used by Pipeline Tree View. Deals with conference set in DB use that instead.
 */
export const SCHOOL_TO_CONFERENCE: Record<string, string> = {
  'Ole Miss': 'SEC',
  'Alabama': 'SEC',
  'Tennessee': 'SEC',
  'Texas A&M': 'SEC',
  'Arkansas': 'SEC',
  'Boulder': 'Pac-12',
  'Chapman': 'Non-SEC',
};

export function getConferenceForDeal(deal: { organization?: string | null; conference?: string | null }): string {
  const fromDb = deal.conference?.trim();
  if (fromDb) return fromDb;
  const org = deal.organization?.trim();
  if (!org) return 'Other';
  return SCHOOL_TO_CONFERENCE[org] ?? 'Other';
}
