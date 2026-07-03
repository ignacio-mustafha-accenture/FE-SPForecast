import type { AppState } from '@/src/core/domain/app-state';
import type { IStateRepository } from '@/src/core/ports/IStateRepository';

import { createFetcher, type FetcherCtx } from './fetcher';
import { mapRawAppState } from './mappers';
import type { RawAppState } from './types';

export class HttpStateRepository implements IStateRepository {
  private fetch: ReturnType<typeof createFetcher>;

  constructor(ctx: FetcherCtx) {
    this.fetch = createFetcher(ctx);
  }

  async getState(windowOffset: number): Promise<AppState> {
    const raw = await this.fetch<RawAppState>(`/api/state?window_offset=${windowOffset}`);
    return mapRawAppState(raw, windowOffset);
  }
}
