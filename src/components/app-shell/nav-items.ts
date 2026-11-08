import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Bell,
  ChartNoAxesColumn,
  FileText,
  HandCoins,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    description: "Totals, trends, and what needs attention",
  },
  {
    href: "/ai-agent",
    label: "AI agent",
    icon: Sparkles,
    description: "Prepare actions in plain language",
  },
  {
    href: "/transactions",
    label: "Transactions",
    icon: ArrowLeftRight,
    description: "PayPal order history and status",
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: FileText,
    description: "Draft, send, and track invoices",
  },
  {
    href: "/payment-requests",
    label: "Payment requests",
    icon: HandCoins,
    description: "Collect with a PayPal Sandbox order",
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: ChartNoAxesColumn,
    description: "Cash flow and collection insight",
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    description: "Payments, reminders, and security",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Profile, currency, and security",
  },
];

export function titleForPath(pathname: string) {
  if (pathname.startsWith("/ai-agent")) return "AI agent";
  const match = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.label ?? "Workspace";
}
