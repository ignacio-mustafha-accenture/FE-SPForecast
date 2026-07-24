export type ScenarioType = 'assumption' | 'effective';

export interface ChargeabilityBlock {
  id: number;
  eid: string;
  periodName: string | null;
  chargeabilityPct: number;
  scenarioType: ScenarioType;
  startDate: string;
  endDate: string;
  createdBy: string | null;
  createdAt: string | null;
  effectivizationDate: string | null;
}

export interface CreateChargeabilityBlockPayload {
  start_date: string;
  end_date: string;
  chargeability_pct: number;
  scenario_type: ScenarioType;
  effectivization_date?: string;
}
