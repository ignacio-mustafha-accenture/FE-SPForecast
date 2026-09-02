export interface Period {
  sahByCountry?: Record<string, number>;
  label: string;
  startDate: string;
  endDate: string;
  windowOffset: number;
}
