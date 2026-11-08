"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUp,
  History,
  Loader2,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/status-pill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AGENT_SUGGESTIONS } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { AgentActionCard, type ActionOverrides } from "./agent-action-card";
import type {
  ActionMetadata,
  AgentChatResult,
  AgentConversation,
  AgentMessage,
  AgentResultSummary,
} from "@/types/database";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata: ActionMetadata | null;
  createdAt: string;
  pending?: boolean;
};

function toUiMessage(row: AgentMessage): UiMessage {
  return {
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
    metadata: row.action_metadata ?? null,
    createdAt: row.created_at,
  };
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300"
            style={{ animationDelay: `${index * 160}ms`, animationDuration: "1.1s" }}
          />
        ))}
      </span>
      <span className="text-xs text-slate-400">Reading your ledger and preparing a plan</span>
    </div>
  );
}

export function AgentWorkspace({
  initialConversations,
  initialConversation,
  initialMessages,
  initialPrompt,
  databaseError,
  geminiConfigured,
}: {
  initialConversations: AgentConversation[];
  initialConversation: AgentConversation | null;
  initialMessages: AgentMessage[];
  initialPrompt: string;
  databaseError: string | null;
  geminiConfigured: boolean;
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversation?.id ?? null);
  const [activeTitle, setActiveTitle] = useState(initialConversation?.title ?? "New conversation");
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages.map(toUiMessage));
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [composer, setComposer] = useState(initialPrompt);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentConversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const localMessageCount = useRef(0);

  function nextLocalId(prefix: string) {
    localMessageCount.current += 1;
    return `local-${prefix}-${localMessageCount.current}`;
  }

  const empty = messages.length === 0;
  const disabled = Boolean(databaseError);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, sending]);

  useEffect(() => {
    if (initialPrompt) textareaRef.current?.focus();
  }, [initialPrompt]);

  const suggestionsToShow = useMemo(() => {
    if (suggestions.length > 0) return suggestions;
    return empty ? AGENT_SUGGESTIONS.slice(0, 4) : [];
  }, [empty, suggestions]);

  function resizeComposer(element: HTMLTextAreaElement) {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 168)}px`;
  }

  async function refreshConversations() {
    try {
      const response = await fetch("/api/ai/conversations?limit=40");
      const payload = (await response.json()) as { conversations?: AgentConversation[] };
      if (response.ok && payload.conversations) setConversations(payload.conversations);
    } catch {
      // The existing list stays usable when this refresh fails.
    }
  }

  function startNew() {
    setActiveId(null);
    setActiveTitle("New conversation");
    setMessages([]);
    setSuggestions([]);
    setComposer("");
    setError(null);
    setHistoryOpen(false);
    window.history.replaceState(null, "", "/ai-agent");
    textareaRef.current?.focus();
  }

  async function openConversation(id: string) {
    if (id === activeId) {
      setHistoryOpen(false);
      return;
    }
    setLoadingHistory(id);
    setError(null);
    try {
      const response = await fetch(`/api/ai/conversations/${id}`);
      const payload = (await response.json()) as {
        conversation?: AgentConversation;
        messages?: AgentMessage[];
        error?: string;
      };
      if (!response.ok || !payload.conversation) {
        toast.error(payload.error ?? "That conversation could not be loaded.");
        return;
      }
      setActiveId(payload.conversation.id);
      setActiveTitle(payload.conversation.title);
      setMessages((payload.messages ?? []).map(toUiMessage));
      setSuggestions([]);
      setHistoryOpen(false);
      window.history.replaceState(null, "", `/ai-agent?conversation=${payload.conversation.id}`);
    } catch {
      toast.error("That conversation could not be loaded.");
    } finally {
      setLoadingHistory(null);
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending || disabled) return;

    const now = new Date().toISOString();
    const userMessage: UiMessage = {
      id: nextLocalId("user"),
      role: "user",
      content: message,
      metadata: null,
      createdAt: now,
    };
    const pendingId = nextLocalId("assistant-pending");
    const pending: UiMessage = {
      id: pendingId,
      role: "assistant",
      content: "",
      metadata: null,
      createdAt: now,
      pending: true,
    };

    setMessages((previous) => [...previous, userMessage, pending]);
    setComposer("");
    setSuggestions([]);
    setError(null);
    setSending(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, message }),
      });
      const payload = (await response.json()) as AgentChatResult & {
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        setMessages((previous) => previous.filter((item) => item.id !== pendingId));
        const detail = payload.error ?? "The agent could not answer that request.";
        setError(detail);
        toast.error(detail);
        return;
      }

      const metadata: ActionMetadata = {
        engine: payload.engine,
        status: payload.action ? "pending_confirmation" : "none",
        ...(payload.action ? { action_id: payload.action.actionId } : {}),
        proposal: payload.action?.payload ?? null,
      };

      const assistant: UiMessage = {
        id: nextLocalId("assistant"),
        role: "assistant",
        content: payload.reply,
        metadata,
        createdAt: payload.savedAt ?? new Date().toISOString(),
      };

      setMessages((previous) =>
        previous.map((item) => (item.id === pendingId ? assistant : item))
      );
      setActiveId(payload.conversationId);
      setActiveTitle(payload.conversationTitle);
      setSuggestions(payload.suggestions ?? []);
      window.history.replaceState(
        null,
        "",
        `/ai-agent?conversation=${payload.conversationId}`
      );
      void refreshConversations();
    } catch {
      setMessages((previous) => previous.filter((item) => item.id !== pendingId));
      setError("The agent could not be reached. Check your connection and try again.");
      toast.error("The agent could not be reached.");
    } finally {
      setSending(false);
    }
  }

  function patchMetadata(messageId: string, patch: Partial<ActionMetadata>) {
    setMessages((previous) =>
      previous.map((item) =>
        item.id === messageId && item.metadata
          ? { ...item, metadata: { ...item.metadata, ...patch } }
          : item
      )
    );
  }

  async function executeAction(
    messageId: string,
    actionId: string,
    overrides: ActionOverrides
  ) {
    setBusyAction(actionId);
    setActionErrors((previous) => ({ ...previous, [actionId]: null }));

    try {
      const response = await fetch("/api/ai/execute-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, overrides }),
      });
      const payload = (await response.json()) as {
        status?: string;
        invoice?: { id: string; kind: "invoice" | "payment_request" };
        paymentRequestUrl?: string;
        emailSent?: boolean;
        message?: string;
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        const detail =
          payload.code === "paypal_not_configured"
            ? "PayPal server credentials are not configured yet. The preview stays here."
            : payload.code === "email_not_configured"
              ? "Email delivery is not configured yet. Add RESEND_API_KEY, then confirm again."
              : payload.error ?? "The action could not be completed.";
        setActionErrors((previous) => ({ ...previous, [actionId]: detail }));
        if (payload.code === "action_expired") {
          patchMetadata(messageId, { status: "expired" });
        }
        toast.error(detail);
        return;
      }

      const summary: AgentResultSummary = {
        invoiceId: payload.invoice?.id,
        kind: payload.invoice?.kind,
        status: payload.status,
        paymentRequestUrl: payload.paymentRequestUrl,
        emailSent: payload.emailSent,
        message: payload.message ?? "The action was completed.",
      };

      patchMetadata(messageId, { status: "executed", result: summary, error: null });
      toast.success(payload.message ?? "The action was completed.");
      window.dispatchEvent(new Event("paypilot:notifications-updated"));
      router.refresh();
    } catch {
      const detail = "The action could not be reached. Nothing was executed.";
      setActionErrors((previous) => ({ ...previous, [actionId]: detail }));
      toast.error(detail);
    } finally {
      setBusyAction(null);
    }
  }

  async function declineAction(messageId: string, actionId: string) {
    setBusyAction(actionId);
    try {
      const response = await fetch("/api/ai/decline-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId }),
      });
      const payload = (await response.json()) as { status?: string; error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "The action could not be declined.");
        return;
      }
      patchMetadata(messageId, { status: "declined", error: null });
      toast("Action declined. Nothing was executed.");
    } catch {
      toast.error("The action could not be declined.");
    } finally {
      setBusyAction(null);
    }
  }

  async function removeConversation() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/ai/conversations/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(payload.error ?? "The conversation could not be deleted.");
        return;
      }
      setConversations((previous) =>
        previous.filter((conversation) => conversation.id !== deleteTarget.id)
      );
      if (activeId === deleteTarget.id) startNew();
      toast.success("Conversation deleted.");
      setDeleteTarget(null);
    } catch {
      toast.error("The conversation could not be deleted.");
    } finally {
      setDeleting(false);
    }
  }

  const conversationList = (
    <div className="space-y-1">
      {conversations.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs leading-5 text-slate-500">
          No conversations yet. Your history appears here once you send a message.
        </p>
      ) : (
        conversations.map((conversation) => {
          const active = conversation.id === activeId;
          return (
            <div
              key={conversation.id}
              className={cn(
                "group flex items-center gap-1 rounded-xl pr-1 transition-colors",
                active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
              )}
            >
              <button
                type="button"
                onClick={() => openConversation(conversation.id)}
                className="focus-ring min-w-0 flex-1 rounded-xl px-3 py-2.5 text-left"
              >
                <span className="flex items-center gap-2">
                  {loadingHistory === conversation.id ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan-300" aria-hidden="true" />
                  ) : (
                    <MessageSquare
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        active ? "text-violet-200" : "text-slate-500"
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-xs font-medium",
                      active ? "text-white" : "text-slate-300"
                    )}
                  >
                    {conversation.title}
                  </span>
                </span>
                <span className="mt-1 block pl-5 text-[10px] text-slate-500">
                  {formatRelativeTime(conversation.updated_at)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(conversation)}
                className="focus-ring grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-200 focus-visible:opacity-100 group-hover:opacity-100"
                aria-label={`Delete ${conversation.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-[540px] flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-white/[0.06] lg:flex">
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            <div>
              <p className="text-xs font-semibold text-white">Conversations</p>
              <p className="text-[11px] text-slate-500">Your own history, private by RLS</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="iconSm"
              onClick={startNew}
              aria-label="Start a new conversation"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">{conversationList}</div>
          <div className="border-t border-white/[0.06] px-3 py-3">
            <p className="flex items-start gap-1.5 text-[10px] leading-4 text-slate-500">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300/70" aria-hidden="true" />
              The agent proposes. You confirm. The server executes.
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="focus-ring grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-slate-300 lg:hidden"
              aria-label="Open conversation history"
            >
              <History className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{activeTitle}</p>
              <p className="truncate text-[11px] text-slate-500">
                {geminiConfigured
                  ? "Gemini planning with deterministic local fallback"
                  : "Local planning engine. Add GEMINI_API_KEY for Gemini reasoning."}
              </p>
            </div>
            <Badge tone={geminiConfigured ? "violet" : "neutral"}>
              {geminiConfigured ? "Gemini ready" : "Local planner"}
            </Badge>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={startNew}
              className="hidden sm:inline-flex"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New
            </Button>
          </div>

          {disabled ? (
            <div className="flex items-start gap-2 border-b border-amber-300/20 bg-amber-400/[0.06] px-4 py-2.5 text-xs leading-5 text-amber-100">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              The database schema is not applied yet, so conversations cannot be saved. Apply
              <span className="font-mono"> supabase/migrations/0001_init.sql</span> and reload.
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 border-b border-rose-300/20 bg-rose-400/[0.06] px-4 py-2.5 text-xs leading-5 text-rose-100" role="alert">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {error}
            </div>
          ) : null}

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-3xl space-y-5">
              {empty ? (
                <div className="pb-2 pt-6 text-center sm:pt-12">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-cyan-400/15 text-violet-200 ring-1 ring-inset ring-white/10">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-balance text-xl font-semibold tracking-[-0.02em] text-white">
                    What should we take care of?
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                    Ask in plain language. The agent reads only your ledger, prepares a preview,
                    and waits for your explicit confirmation before anything runs.
                  </p>
                </div>
              ) : null}

              {messages.map((message) => {
                const proposal = message.metadata?.proposal;
                const actionId = message.metadata?.action_id;
                const status = message.metadata?.status ?? "none";

                if (message.role === "user") {
                  return (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md border border-violet-400/20 bg-violet-500/[0.12] px-4 py-3 text-sm leading-6 text-white">
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={message.id} className="flex gap-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-400/15 text-violet-200 ring-1 ring-inset ring-white/10">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-3">
                      {message.pending ? (
                        <TypingIndicator />
                      ) : (
                        <div className="rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">
                            {message.content}
                          </p>
                          <p className="mt-2 text-[10px] text-slate-600">
                            {message.metadata?.engine === "gemini"
                              ? "Gemini plan"
                              : message.metadata?.engine === "local"
                                ? "Local planning engine"
                                : "Agent"}
                            {message.createdAt ? ` · ${formatRelativeTime(message.createdAt)}` : ""}
                          </p>
                        </div>
                      )}

                      {!message.pending && proposal && actionId ? (
                        <AgentActionCard
                          key={actionId}
                          payload={proposal}
                          status={status}
                          result={message.metadata?.result ?? null}
                          error={actionErrors[actionId] ?? message.metadata?.error ?? null}
                          busy={busyAction === actionId}
                          onConfirm={(overrides) =>
                            executeAction(message.id, actionId, overrides)
                          }
                          onDecline={() => declineAction(message.id, actionId)}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          </div>

          <div className="border-t border-white/[0.06] bg-ink-950/60 px-3 py-3 sm:px-6">
            <div className="mx-auto max-w-3xl space-y-2">
              {suggestionsToShow.length > 0 && !sending ? (
                <div className="flex flex-wrap gap-1.5">
                  {suggestionsToShow.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      disabled={disabled}
                      className="focus-ring rounded-full border border-white/[0.09] bg-white/[0.03] px-3 py-1.5 text-left text-[11px] text-slate-300 transition-colors hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/30 p-2 focus-within:border-violet-400/30">
                <Textarea
                  ref={textareaRef}
                  value={composer}
                  rows={1}
                  onChange={(event) => {
                    setComposer(event.target.value);
                    resizeComposer(event.target);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void send(composer);
                    }
                  }}
                  disabled={disabled}
                  placeholder={
                    disabled
                      ? "Apply the database migration to start a conversation"
                      : "Ask for an invoice, a request, a reminder, or an analysis"
                  }
                  aria-label="Message the agent"
                  className="max-h-40 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none hover:border-0 focus:border-0"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => void send(composer)}
                  disabled={disabled || sending || composer.trim().length === 0}
                  aria-label="Send message"
                  className="h-9 w-9 shrink-0 rounded-xl"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>

              <p className="text-center text-[10px] leading-4 text-slate-600">
                AI can be wrong. Every financial action waits for your confirmation. Sandbox only.
              </p>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conversation history</DialogTitle>
            <DialogDescription>Switch between your saved agent sessions.</DialogDescription>
          </DialogHeader>
          <div className="-mx-2 max-h-[50dvh] overflow-y-auto px-2">{conversationList}</div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={startNew}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this conversation?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.title} and its messages will be removed from your account. This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteTarget(null)}>
              Keep it
            </Button>
            <Button type="button" variant="danger" onClick={removeConversation} loading={deleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
