import type { PPALog, PPACreatePayload } from '../domain/ppa';
import type { Page, PPAFilter } from '../domain/pagination';

export interface IPPARepository {
  list(filter: PPAFilter): Promise<Page<PPALog>>;
  create(payload: PPACreatePayload): Promise<void>;
}
