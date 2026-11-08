import type { Currency } from "@/types/database";

const formatterCache = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: Currency, compact: boolean) {
  const key = `${currency}:${compact}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
    minimumFractionDigits: compact ? 0 : currency === "JPY" ? 0 : 2,
  });
  formatterCache.set(key, formatter);
  return formatter;
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: Currency | string = "USD",
  options: { compact?: boolean; sign?: boolean } = {}
) {
  const value = typeof amount === "string" ? Number(amount) : amount ?? 0;
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = getCurrencyFormatter(currency as Currency, Boolean(options.compact)).format(
    Math.abs(safe)
  );
  if (options.sign && safe !== 0) {
    return `${safe > 0 ? "+" : "−"}${formatted}`;
  }
  return safe < 0 ? `−${formatted}` : formatted;
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat("en-US", options).format(value);
}

export function formatPercent(value: number, digits = 0) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}

export function formatDate(value: string | Date | null | undefined, withYear = true) {
  if (!value) return "Not set";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "Unknown";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(minutes) < 1) return "Just now";
  if (Math.abs(minutes) < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return `${days}d ago`;
  return formatDate(date);
}

export function initials(name: string | null | undefined, email?: string | null) {
  const source = (name || email || "P").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function truncateMiddle(value: string, head = 8, tail = 6) {
  if (!value) return "Not available";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export function greetingForHour(hour: number) {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Draft",
    pending: "Pending",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
    created: "Created",
    approved: "Approved",
    completed: "Completed",
    failed: "Failed",
    refunded: "Refunded",
    executed: "Executed",
    declined: "Declined",
    expired: "Expired",
    pending_confirmation: "Awaiting confirmation",
  };
  return labels[status] ?? titleCase(status.replaceAll("_", " "));
}

export function providerLabel(provider: string) {
  const labels: Record<string, string> = {
    google: "Google",
    github: "GitHub",
    email: "Email and password",
    anonymous: "Demo explorer",
  };
  return labels[provider] ?? titleCase(provider.replaceAll("_", " "));
}
