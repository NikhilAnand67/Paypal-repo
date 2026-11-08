import { Badge } from "@/components/ui/status-pill";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/primitives";

const items = [
  {
    question: "Does PayPilot move real money?",
    answer:
      "No. This hackathon build runs against PayPal Sandbox only. Orders, approvals, captures, and webhooks are real API calls, but they operate on test accounts. Live hosts stay disabled unless an operator explicitly opts in.",
  },
  {
    question: "What can the AI do without my confirmation?",
    answer:
      "It can read your own invoices, payment requests, and transactions, then explain totals or trends. Anything that creates, sends, or collects money becomes a pending action that waits for your approval.",
  },
  {
    question: "Which PayPal APIs do you use?",
    answer:
      "The Orders v2 API creates and captures orders, the PayPal JS SDK handles buyer approval, and webhooks keep the ledger current when a capture completes, is denied, or is refunded.",
  },
  {
    question: "What happens if credentials are missing?",
    answer:
      "The interface reports which integration needs setup. PayPal checkout, Gemini reasoning, and email sending degrade gracefully: the financial logic still protects your records, and demonstration data can be used without external credentials.",
  },
  {
    question: "How is demonstration data handled?",
    answer:
      "Demonstration invoices, transactions, and notifications carry a demo flag. Loading or clearing demo data never touches records created by a real Sandbox capture, and the interface labels demo records throughout.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "Records live in Supabase Postgres with row level security enabled. Authentication uses Supabase Auth with Google and GitHub OAuth. Session cookies are handled by the server, and secrets are never sent to the browser.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="relative py-20 sm:py-24">
      <div className="section-shell">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <Badge tone="neutral">Questions</Badge>
            <h2 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              Straight answers, before you sign in.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              A short tour of how the agent, the Sandbox, and the data boundary fit together.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {items.map((item, index) => (
              <AccordionItem key={item.question} value={`item-${index}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
