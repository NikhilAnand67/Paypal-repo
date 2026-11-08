import type { Metadata } from "next";
import { getAccount } from "@/lib/auth/account";
import { DemoExperience } from "@/components/demo/demo-experience";

export const metadata: Metadata = {
  title: "Guided demo",
  description: "A twelve step tour of the PayPilot AI agent, invoice flow, and PayPal Sandbox checkout.",
  alternates: { canonical: "/demo" },
};

export default async function DemoPage() {
  const account = await getAccount();
  return <DemoExperience signedIn={Boolean(account.user)} />;
}
