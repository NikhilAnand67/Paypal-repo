"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronsUpDown,
  LogOut,
  Menu,
  PanelLeft,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/primitives";
import { Logo } from "@/components/ui/brand";
import { initials, providerLabel } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { navItems, titleForPath } from "./nav-items";
import { CommandPalette } from "./command-palette";
import { NotificationBell } from "./notification-bell";

export type ShellAccount = {
  name: string;
  email: string;
  avatarUrl: string | null;
  provider: string;
  currency: string;
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: (typeof navItems)[number];
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-white/[0.07] text-white"
          : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
        collapsed && "justify-center px-0"
      )}
    >
      {active ? (
        <span
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-violet-400 to-cyan-300"
          aria-hidden="true"
        />
      ) : null}
      <item.icon
        className={cn("h-4.5 w-4.5 shrink-0", active ? "text-violet-200" : "text-slate-500")}
        aria-hidden="true"
      />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function AppShell({ account, children }: { account: ShellAccount; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    try {
      // Restoring a browser preference requires reading storage after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(window.localStorage.getItem("paypilot:sidebar") === "collapsed");
    } catch {
      // Private mode can block storage. The default expanded state is fine.
    }
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem("paypilot:sidebar", next ? "collapsed" : "expanded");
      } catch {
        // Storage is optional.
      }
      return next;
    });
  }

  async function signOut() {
    setSigningOut(true);
    try {
      const response = await fetch("/auth/signout", { method: "POST" });
      if (!response.ok) {
        toast.error("Sign out failed. Please try again.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("Sign out failed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  const title = titleForPath(pathname);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh bg-ink-950">
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-white/[0.07] bg-ink-925/80 backdrop-blur-xl transition-[width] duration-300 lg:flex",
            collapsed ? "w-20" : "w-64"
          )}
        >
          <div
            className={cn(
              "flex h-16 items-center border-b border-white/[0.07]",
              collapsed ? "justify-center px-2" : "px-4"
            )}
          >
            <Logo compact={collapsed} />
          </div>

          <div className={cn("px-2.5 py-4", collapsed && "px-2")}>
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5",
                collapsed && "justify-center border-transparent bg-transparent p-0"
              )}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/25 to-cyan-400/15 text-[10px] font-semibold text-violet-100 ring-1 ring-inset ring-white/10">
                {account.name.slice(0, 1).toUpperCase()}
              </span>
              {!collapsed ? (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">Personal workspace</p>
                    <p className="truncate text-[10px] text-slate-500">{account.currency} ledger</p>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                </>
              ) : null}
            </div>
          </div>

          <nav aria-label="Workspace" className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-4">
            {navItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                collapsed={collapsed}
              />
            ))}
          </nav>

          <div className="border-t border-white/[0.07] p-3">
            {collapsed ? (
              <div className="mb-2 grid place-items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-300/15 bg-emerald-400/[0.06] text-emerald-300">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Confirmation required before every financial action.
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="mb-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.05] p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Sandbox and approval
                </div>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
                  Nothing financial runs until you confirm the exact action.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={toggleCollapsed}
              className={cn(
                "focus-ring flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-white",
                collapsed && "justify-center px-0"
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft
                className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")}
                aria-hidden="true"
              />
              {!collapsed ? "Collapse" : null}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-300 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-4.5 w-4.5" aria-hidden="true" />
              </button>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-[-0.01em] text-white">{title}</p>
                <p className="hidden text-[11px] text-slate-500 sm:block">
                  PayPal Sandbox workspace
                </p>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="focus-ring hidden h-10 min-w-56 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 text-left text-xs text-slate-500 transition-colors hover:border-white/15 hover:text-slate-300 md:flex"
                >
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="flex-1">Search workspace</span>
                  <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px]">
                    ⌘K
                  </kbd>
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="focus-ring grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-300 md:hidden"
                  aria-label="Search workspace"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                </button>

                <NotificationBell />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="focus-ring flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] p-1 pr-2 transition-colors hover:border-white/15"
                      aria-label="Open account menu"
                    >
                      <Avatar className="h-8 w-8 overflow-hidden rounded-lg">
                        {account.avatarUrl ? (
                          <AvatarImage src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                        <AvatarFallback className="grid h-full w-full place-items-center bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-[10px] font-semibold text-white">
                          {initials(account.name, account.email)}
                        </AvatarFallback>
                      </Avatar>
                      <PanelLeft className="hidden h-3.5 w-3.5 rotate-90 text-slate-600 sm:block" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="pb-2">
                      <span className="block truncate text-sm font-semibold text-white">
                        {account.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">
                        {account.email || "No email on file"}
                      </span>
                      <span className="mt-2 inline-flex rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-inset ring-white/10">
                        {providerLabel(account.provider)}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/ai-agent">
                        <Sparkles className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        Open AI agent
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/privacy">
                        <ShieldCheck className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        Privacy notes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        if (!signingOut) signOut();
                      }}
                      className="text-rose-200 data-[highlighted]:bg-rose-500/10 data-[highlighted]:text-rose-100"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      {signingOut ? "Signing out..." : "Sign out"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main id="main" className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col border-r border-white/10 bg-ink-925 shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-white/[0.07] px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-white/[0.05] hover:text-white"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="border-b border-white/[0.07] px-4 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 overflow-hidden rounded-lg">
                  {account.avatarUrl ? (
                    <AvatarImage src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                  <AvatarFallback className="grid h-full w-full place-items-center bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-[11px] font-semibold text-white">
                    {initials(account.name, account.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{account.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{account.email}</p>
                </div>
              </div>
            </div>

            <nav aria-label="Mobile workspace" className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
              {navItems.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  collapsed={false}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </nav>

            <div className="border-t border-white/[0.07] p-3">
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-200 transition-colors hover:bg-rose-500/10 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </TooltipProvider>
  );
}
