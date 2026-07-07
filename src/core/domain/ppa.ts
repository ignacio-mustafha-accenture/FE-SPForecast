export interface PPALog {
  id: string;
  employeeId: string;
  employeeName: string;
  country: string;
  fromPeriod: string;
  toPeriod: string;
  hours: number;
  reason: string;
  appliedAt: string;
}

export interface PPACreatePayload {
  eid: string;
  fromPeriod: string;
  toPeriod: string;
  hours: number;
  reason: string;
}
