import type { ChargeabilityStatus, Country } from '@/src/core/domain/employee';

export function getEmployeeStatus(
  cp: number,
  target: number,
  hasClient: boolean,
  isTerminated: boolean,
): ChargeabilityStatus {
  if (isTerminated) return 'leave';
  if (!hasClient) return 'unassigned';
  if (cp >= target) return 'green';
  if (cp >= target * 0.85) return 'yellow';
  return 'red';
}

export function getTargetForCountry(country: Country, targets: Record<string, number>): number {
  const lookups: Record<Country, string[]> = {
    AR: ['argentina'],
    MX: ['mexico', 'méxico'],
    CR: ['costa rica'],
  };
  for (const name of lookups[country]) {
    for (const [key, val] of Object.entries(targets)) {
      if (key.toLowerCase() === name) return val;
    }
  }
  return targets['general'] ?? 87;
}
