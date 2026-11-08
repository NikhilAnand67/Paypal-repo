import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/account";
import { AgentWorkspace } from "@/components/agent/agent-workspace";
import type { AgentConversation, AgentMessage } from "@/types/database";

export const metadata: Metadata = {
  title: "AI agent",
  description: "Prepare invoices, requests, reminders, and analysis in plain language.",
};

export default async function AiAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string; prompt?: string }>;
}) {
  const account = await requireUser();
  const user = account.user!;
  const params = await searchParams;
  const supabase = account.supabase;

  const conversationsResult = await supabase
    .from("agent_conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(40);

  const conversations = conversationsResult.error
    ? []
    : ((conversationsResult.data ?? []) as AgentConversation[]);

  const databaseError = conversationsResult.error ? "database_not_initialized" : null;

  const requestedId = typeof params.conversation === "string" ? params.conversation : null;
  let activeConversation: AgentConversation | null = null;
  let initialMessages: AgentMessage[] = [];

  if (requestedId) {
    const { data: conversation } = await supabase
      .from("agent_conversations")
      .select("*")
      .eq("id", requestedId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (conversation) {
      activeConversation = conversation as AgentConversation;
      const { data: messages } = await supabase
        .from("agent_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(300);
      initialMessages = (messages ?? []) as AgentMessage[];
    }
  }

  return (
    <AgentWorkspace
      initialConversations={conversations}
      initialConversation={activeConversation}
      initialMessages={initialMessages}
      initialPrompt={typeof params.prompt === "string" ? params.prompt.slice(0, 2000) : ""}
      databaseError={databaseError}
      geminiConfigured={Boolean(process.env.GEMINI_API_KEY)}
    />
  );
}
