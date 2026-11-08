"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";
import type { Currency, MonthlyPoint } from "@/types/database";

type TooltipProps = {
  active?: boolean;
  label?: unknown;
  payload?: ReadonlyArray<{ dataKey?: string | number; value?: unknown; color?: string }>;
};

function ChartTooltip({ active, payload, label }: TooltipProps, currency: Currency) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0c0c16]/95 px-3 py-2.5 text-xs shadow-2xl backdrop-blur-xl">
      <p className="font-medium text-white">{String(label ?? "")}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-slate-400">
              {entry.dataKey === "received" ? "Collected" : "Outstanding"}
            </span>
            <span className="tabular ml-auto font-medium text-white">
              {formatCurrency(Number(entry.value ?? 0), currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CashflowChart({
  data,
  currency,
  hasData,
  height = 260,
}: {
  data: MonthlyPoint[];
  currency: Currency;
  hasData: boolean;
  height?: number;
}) {
  const gradientId = `received-${currency}`;
  const collected = data.reduce((total, point) => total + point.received, 0);
  const outstanding = data.reduce((total, point) => total + point.pending, 0);
  const summary = hasData
    ? `Cash flow over ${data.length} months. Collected ${formatCurrency(collected, currency)}. Outstanding ${formatCurrency(outstanding, currency)}.`
    : "No payment history yet.";

  return (
    <div className="relative" style={{ height }} role="img" aria-label={summary}>
      {!hasData ? (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-ink-925/40 px-6 text-center">
          <div>
            <p className="text-sm font-medium text-slate-300">No payment history yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Create a request or load demonstration data to populate this chart.
            </p>
          </div>
        </div>
      ) : null}

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.42} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`${gradientId}-pending`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 11 }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 11 }}
            tickFormatter={(value: number) => formatCurrency(value, currency, { compact: true })}
            width={56}
          />
          <Tooltip
            content={(props) => ChartTooltip(props as unknown as TooltipProps, currency)}
            cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="received"
            stroke="#a78bfa"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            animationDuration={700}
            activeDot={{ r: 4, fill: "#a78bfa", stroke: "#06060b", strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="pending"
            stroke="#67e8f9"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill={`url(#${gradientId}-pending)`}
            animationDuration={800}
            activeDot={{ r: 3, fill: "#67e8f9", stroke: "#06060b", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
