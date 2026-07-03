import type { AppState } from '@/src/core/domain/app-state';
import type { IStateRepository } from '@/src/core/ports/IStateRepository';

export class FetchStateUseCase {
  constructor(private repo: IStateRepository) {}

  execute(windowOffset = 0): Promise<AppState> {
    return this.repo.getState(windowOffset);
  }
}
