export function parseDDMMYY(s: string | null): Date | null {
  if (!s) return null;
  const [d, m, y] = s.split('/').map(Number);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return new Date(2000 + y, m - 1, d);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  // Parse date-only ISO strings (YYYY-MM-DD) as LOCAL time to avoid UTC offset issues
  // e.g. new Date('2024-09-02') is midnight UTC = 21:00 Sep 1 in UTC-3 → wrong day
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    const date = new Date(y, m - 1, d);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(2);
    return `${dd}/${mm}/${yy}`;
  }
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}/${mm}/${yy}`;
}

export function formatName(fullName: string): string {
  const parts = fullName.trim().split(' ');
  if (parts.length <= 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}
