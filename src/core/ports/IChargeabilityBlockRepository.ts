import type { ChargeabilityBlock, CreateChargeabilityBlockPayload } from '../domain/chargeabilityBlock';

export interface IChargeabilityBlockRepository {
  list(eid: string): Promise<ChargeabilityBlock[]>;
  create(eid: string, payload: CreateChargeabilityBlockPayload): Promise<ChargeabilityBlock>;
  delete(eid: string, blockId: number): Promise<void>;
  effectivize(eid: string, periodNames: string[], chargeabilityPct: number): Promise<{ ok: boolean; updated: number }>;
}
