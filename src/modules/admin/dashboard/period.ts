export type DashboardPeriod = 7 | 30 | 90;
const DAY = 86_400_000;
const PERU_OFFSET = 5 * 3_600_000;
export function peruDay(date: Date) { return new Date(date.getTime() - PERU_OFFSET).toISOString().slice(0, 10); }
export function dashboardWindow(value: unknown, now = new Date()) {
  const days: DashboardPeriod = value === "7" ? 7 : value === "90" ? 90 : 30;
  const end = new Date(new Date(`${peruDay(now)}T00:00:00-05:00`).getTime() + DAY);
  const start = new Date(end.getTime() - days * DAY);
  const dates = Array.from({ length: days }, (_, i) => peruDay(new Date(start.getTime() + i * DAY)));
  return { days, start, end, dates };
}
export type DashboardDay = { day: string; orders: number; sales: string };
export function completeDashboardDays(dates: string[], rows: DashboardDay[]): DashboardDay[] {
  const byDay = new Map(rows.map(row => [row.day, row]));
  return dates.map(day => byDay.get(day) ?? { day, orders: 0, sales: "0.00" });
}
