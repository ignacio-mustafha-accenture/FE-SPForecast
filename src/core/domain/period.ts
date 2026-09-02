export interface Period {
  sahByCountry?: Record<string, number>;
  label: string;
  startDate: string;
  endDate: string;
  windowOffset: number;
}

export interface CalendarPeriod {
  name: string;
  startDate: string;
  endDate: string;
}
