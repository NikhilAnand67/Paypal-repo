export function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMonths(base: Date, months: number) {
  const next = new Date(base.getFullYear(), base.getMonth() + months, 1);
  return next;
}

export function startOfMonth(base: Date) {
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

export function startOfDay(base: Date) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate());
}

export function monthKey(base: Date) {
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(base: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(base);
}

export function lastNMonths(count: number, from = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = addMonths(startOfMonth(from), index - (count - 1));
    return {
      key: monthKey(date),
      label: monthLabel(date),
      start: date,
      end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
    };
  });
}

export function daysUntil(value: string | null | undefined, now = new Date()) {
  const due = parseDateOnly(value);
  if (!due) return null;
  const start = startOfDay(now).getTime();
  const end = startOfDay(due).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function isPastDue(value: string | null | undefined, now = new Date()) {
  const days = daysUntil(value, now);
  return days !== null && days < 0;
}

export function dueDateLabel(value: string | null | undefined, now = new Date()) {
  const days = daysUntil(value, now);
  if (days === null) return "No due date";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  if (days === -1) return "1 day overdue";
  return `${Math.abs(days)} days overdue`;
}
