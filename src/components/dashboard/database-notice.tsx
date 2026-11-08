import { Database, Terminal } from "lucide-react";

export function DatabaseNotice() {
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.05] p-5">
      <div className="flex gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-amber-400/[0.08] text-amber-200">
          <Database className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">The database schema is not applied yet</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            Supabase is reachable, but the PayPilot tables are missing. Apply the migration in the
            Supabase SQL editor, or run the Supabase CLI from the project root. Then reload this page.
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5">
            <Terminal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
            <code className="font-mono text-[11px] leading-5 text-slate-300">
              supabase db push
              <span className="mt-1 block text-slate-500">
                Migration: supabase/migrations/0001_init.sql
              </span>
            </code>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Row level security, triggers, and realtime publication are all part of that migration.
          </p>
        </div>
      </div>
    </div>
  );
}
