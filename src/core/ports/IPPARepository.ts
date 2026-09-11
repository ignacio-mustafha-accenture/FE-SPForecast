import type { PPALog, PPACreatePayload } from '../domain/ppa';
import type { Page, PPAFilter } from '../domain/pagination';

export interface IPPARepository {
  list(filter: PPAFilter): Promise<Page<PPALog>>;
  getById(ppaId: string): Promise<PPALog>;
  create(payload: PPACreatePayload): Promise<void>;
  approve(ppaId: string): Promise<void>;
  reject(ppaId: string, reason: string): Promise<void>;
  reverse(ppaId: string): Promise<void>;
}