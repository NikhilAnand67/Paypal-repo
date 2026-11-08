import "server-only";

import { askGemini, isGeminiConfigured, type AiMessage } from "@/lib/ai/gemini";
import { runLocalAgent } from "@/lib/ai/local-agent";
import type { AgentIntent, AgentSnapshot } from "@/types/database";

export type AgentOutcome = {
  reply: string;
  intent: AgentIntent;
  action: ReturnType<typeof runLocalAgent>["action"];
  suggestions: string[];
  engine: "gemini" | "local";
};

export async function reasonAboutMessage(params: {
  message: string;
  snapshot: AgentSnapshot;
  history: AiMessage[];
  userName: string;
}): Promise<AgentOutcome> {
  if (isGeminiConfigured()) {
    const remote = await askGemini(params);
    if (remote) {
      return { ...remote, engine: "gemini" };
    }
  }

  const local = runLocalAgent(params.message, params.snapshot);
  return { ...local, engine: "local" };
}
