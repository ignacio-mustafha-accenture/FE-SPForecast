// Totales del bloque superior de la hoja 'Forecast Update' del Excel (filas 3 a 8):
// el total por pais y el desglose de Argentina por offering.
export type TotalRowKind = 'country' | 'offering';

export interface TotalPeriodValues {
  chgHl: number;
  chgSl: number;
  chgNeto: number;
  chg: number;
  sah: number;
}

export interface ForecastTotalRow {
  key: string;
  label: string;
  kind: TotalRowKind;
  country: string;
  // Target de cargabilidad de la fila, en porcentaje (ej: 87.2)
  targetPct: number;
  // Headcount del grupo: cuenta toda la poblacion filtrada, tengan horas cargadas o no
  hc: number;
  // Un elemento por periodo, en el mismo orden que las columnas de la tabla
  periods: TotalPeriodValues[];
}

export interface ForecastTotals {
  periodNames: string[];
  rows: ForecastTotalRow[];
}
