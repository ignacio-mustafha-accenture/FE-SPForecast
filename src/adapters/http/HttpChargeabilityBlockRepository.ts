import type { ChargeabilityBlock, CreateChargeabilityBlockPayload, ScenarioType } from '@/src/core/domain/chargeabilityBlock';
import type { IChargeabilityBlockRepository } from '@/src/core/ports/IChargeabilityBlockRepository';

interface RawBlock {
  id: number;
  eid: string;
  period_name: string | null;
  chargeability_pct: number;
  scenario_type: string;
  start_date: string;
  end_date: string;
  created_by: string | null;
  created_at: string | null;
  effectivization_date: string | null;
}

function mapBlock(raw: RawBlock): ChargeabilityBlock {
  return {
    id: raw.id,
    eid: raw.eid,
    periodName: raw.period_name,
    chargeabilityPct: raw.chargeability_pct,
    scenarioType: (raw.scenario_type === 'effective' ? 'effective' : 'assumption') as ScenarioType,
    startDate: raw.start_date,
    endDate: raw.end_date,
    createdBy: raw.created_by,
    createdAt: raw.created_at,
    effectivizationDate: raw.effectivization_date ?? null,
  };
}

export class HttpChargeabilityBlockRepository implements IChargeabilityBlockRepository {
  async list(eid: string): Promise<ChargeabilityBlock[]> {
    const res = await fetch(`/api/employees/${eid}/chargeability-blocks`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch chargeability blocks');
    const data: RawBlock[] = await res.json();
    return data.map(mapBlock);
  }

  async create(eid: string, payload: CreateChargeabilityBlockPayload): Promise<ChargeabilityBlock> {
    const res = await fetch(`/api/employees/${eid}/chargeability-blocks`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Failed to create chargeability block');
    }
    const data: RawBlock = await res.json();
    return mapBlock(data);
  }

  async delete(eid: string, blockId: number): Promise<void> {
    const res = await fetch(`/api/employees/${eid}/chargeability-blocks/${blockId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok && res.status !== 204) {
      throw new Error('Failed to delete chargeability block');
    }
  }

  async effectivize(eid: string, periodNames: string[], chargeabilityPct: number): Promise<{ ok: boolean; updated: number }> {
    const res = await fetch(`/api/employees/${eid}/effectivize`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_names: periodNames.length > 0 ? periodNames : null,
        chargeability_pct: chargeabilityPct,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Failed to effectivize employee');
    }
    return res.json();
  }
}
