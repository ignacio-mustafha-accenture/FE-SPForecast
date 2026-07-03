export interface IPPARepository {
  apply(employeeId: string, periodLabel: string): Promise<void>;
}
