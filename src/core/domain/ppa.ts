export interface PPALog {
  id: string;
  employeeId: string;
  employeeName: string;
  country: string;
  fromPeriod: string;
  toPeriod: string;
  hours: number;
  hoursChargeable?: number | null;
  hoursStandard?: number | null;
  reason: string;
  appliedAt: string;
  status: string;
  rejectionReason?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  reversedBy?: string | null;
  reversedAt?: string | null;
}

export interface PPACreatePayload {
  eid: string;
  fromPeriod: string;
  toPeriod: string;
  hoursChargeable?: number;
  hoursStandard?: number;
  reason: string;
}
