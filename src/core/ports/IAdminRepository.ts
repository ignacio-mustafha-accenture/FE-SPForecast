export interface IAdminRepository {
  recalculate(periodName: string): Promise<void>;
  sync(): Promise<void>;
}
