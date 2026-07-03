export interface IAdminRepository {
  recalculate(): Promise<void>;
  sync(): Promise<void>;
}
