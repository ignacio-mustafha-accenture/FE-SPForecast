import type { AppState } from '../domain/app-state';

export interface IStateRepository {
  getState(windowOffset: number): Promise<AppState>;
}
