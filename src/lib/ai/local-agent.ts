import type {
  AgentActionPayload,
  AgentIntent,
  AgentSnapshot,
  Currency,
} from "@/types/database";

export type LocalAgentResult = {
  reply: string;
  intent: AgentIntent;
  action: AgentActionPayload | null;
  suggestions: string[];
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
};

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const SERVICE_WORDS =
  /(development|design|work|project|service|website|web site|app|logo|brand|branding|consulting|retainer|landing|dashboard|marketing|content|writing|seo|audit|maintenance|illustration|photography|video|copy)/i;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function validDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime()) || toDateOnly(date) !== value) return null;
  return value;
}

export function parseAmount(text: string): { amount: number | null; currency: Currency } {
  const patterns: { regex: RegExp; currency: Currency }[] = [
    { regex: /\$\s?([\d,]+(?:\.\d{1,2})?)/, currency: "USD" },
    { regex: /€\s?([\d,]+(?:\.\d{1,2})?)/, currency: "EUR" },
    { regex: /£\s?([\d,]+(?:\.\d{1,2})?)/, currency: "GBP" },
    { regex: /([\d,]+(?:\.\d{1,2})?)\s?(?:usd|dollars?)\b/i, currency: "USD" },
    { regex: /([\d,]+(?:\.\d{1,2})?)\s?(?:eur|euros?)\b/i, currency: "EUR" },
    { regex: /([\d,]+(?:\.\d{1,2})?)\s?(?:gbp|pounds?|sterling)\b/i, currency: "GBP" },
    { regex: /([\d,]+(?:\.\d{1,2})?)\s?(?:cad|c\$)\b/i, currency: "CAD" },
    { regex: /([\d,]+(?:\.\d{1,2})?)\s?(?:aud|a\$)\b/i, currency: "AUD" },
    { regex: /([\d,]+(?:\.\d{1,2})?)\s?(?:jpy|yen)\b/i, currency: "JPY" },
    { regex: /([\d,]+(?:\.\d{1,2})?)\s?(?:chf)\b/i, currency: "CHF" },
    { regex: /([\d,]+(?:\.\d{1,2})?)\s?(?:sgd)\b/i, currency: "SGD" },
    { regex: /([\d,]+(?:\.\d{1,2})?)\s?(?:hkd)\b/i, currency: "HKD" },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      const parsed = Number(match[1].replaceAll(",", ""));
      if (Number.isFinite(parsed) && parsed > 0) {
        return { amount: round(parsed), currency: pattern.currency };
      }
    }
  }

  return { amount: null, currency: "USD" };
}

export function parseDueDate(text: string, now = new Date()): string | null {
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    const value = validDateOnly(isoMatch[1]);
    if (value) return value;
  }

  if (/\btomorrow\b/i.test(text)) return toDateOnly(addDays(now, 1));
  if (/\btoday\b/i.test(text)) return toDateOnly(now);
  if (/\bnext\s+week\b/i.test(text)) return toDateOnly(addDays(now, 7));
  if (/\bnext\s+month\b/i.test(text)) return toDateOnly(addDays(now, 30));

  const relative = text.match(
    /\bin\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fourteen|fifteen|twenty|thirty|a|an)\s+(day|days|week|weeks|fortnight|month|months)\b/i
  );
  if (relative) {
    const raw = relative[1].toLowerCase();
    const count = Number(raw) || NUMBER_WORDS[raw] || 1;
    const unit = relative[2].toLowerCase();
    const days = unit.startsWith("week")
      ? count * 7
      : unit === "fortnight"
        ? 14
        : unit.startsWith("month")
          ? count * 30
          : count;
    return toDateOnly(addDays(now, days));
  }

  const monthMatch = text.match(
    new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`, "i")
  );
  if (monthMatch) {
    const monthIndex = MONTHS.indexOf(monthMatch[1].toLowerCase());
    const day = Number(monthMatch[2]);
    let year = monthMatch[3] ? Number(monthMatch[3]) : now.getFullYear();
    const candidate = new Date(year, monthIndex, day);
    if (!monthMatch[3] && candidate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
      year += 1;
    }
    const finalDate = new Date(year, monthIndex, day);
    if (finalDate.getDate() !== day) return null;
    return toDateOnly(finalDate);
  }

  return null;
}

export function extractEmail(text: string): string | null {
  const match = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  return match ? match[0].toLowerCase() : null;
}

function cleanSubject(value: string) {
  return value
    .replace(/^(?:my|the|a|an)\s+/i, "")
    .replace(/\s+(?:client|customer)$/i, "")
    .replace(/[.,;:]+$/, "")
    .trim();
}

function titleCase(value: string) {
  return value.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export function parseSubject(text: string): {
  customer_name: string | null;
  description: string | null;
} {
  const explicitDescription = text.match(/\b(?:description|scope)\s*[:\-]\s*([^.;\n]+)/i);
  let description = explicitDescription ? cleanSubject(explicitDescription[1]) : null;
  let customer: string | null = null;

  const leadingCustomer = text.match(
    /\b(?:invoice|bill|payment request|charge)\s+(?:(?:the|my|our)\s+)?([A-Za-z][A-Za-z0-9&.'-]*(?:\s+[A-Za-z][A-Za-z0-9&.'-]*){0,2})\s+(?:for|to cover)\s+/i
  );
  if (leadingCustomer) {
    const candidate = cleanSubject(leadingCustomer[1]);
    if (candidate && !SERVICE_WORDS.test(candidate) && candidate.split(" ").length <= 4) {
      customer = candidate;
    }
  }

  const forPhrases = [...text.matchAll(/\bfor\s+(?:my\s+|our\s+|the\s+)?([^,.;\n]+)/gi)];
  for (const phrase of forPhrases) {
    const raw = phrase[1]
      .replace(/\s+(?:due|paid|payment|invoice|request)\b.*$/i, "")
      .replace(/\s+in\s+\w+\s+(?:days?|weeks?|months?)\b.*$/i, "")
      .trim();
    const cleaned = cleanSubject(raw);
    if (!cleaned || /^[\d$,.]+$/.test(cleaned)) continue;

    const namedClient = cleaned.match(/^(?:client|customer)\s+(.+)$/i);
    if (namedClient) {
      const named = cleanSubject(namedClient[1]);
      if (named && !SERVICE_WORDS.test(named) && named.split(" ").length <= 4) {
        customer = customer ?? titleCase(named);
      } else if (named) {
        description = description ?? named;
      }
      continue;
    }

    const hadClientMarker = /\b(?:client|customer)\b/i.test(cleaned);
    const service = cleanSubject(cleaned.replace(/\b(?:client|customer)\b\s*$/i, "")) || cleaned;

    if (SERVICE_WORDS.test(service) || hadClientMarker || service.split(" ").length > 5) {
      description = description ?? service;
      continue;
    }

    if (!customer) customer = titleCase(service);
  }

  if (!description) {
    const forDescription = text.match(
      /\b(?:invoice|payment request|bill|charge)\s+for\s+([^,.;\n]+?)(?:\s+for\s+\$|\s+due|\s+in\s+\w+\s+(?:days?|weeks?|months?)|[.,;]|$)/i
    );
    if (forDescription) {
      const value = cleanSubject(forDescription[1]);
      if (value && !/^[\d$,.]+$/.test(value)) description = value;
    }
  }

  return {
    customer_name: customer,
    description: description ? titleCase(description) : null,
  };
}

function formatMoney(amount: number, currency: Currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDateShort(value: string | null) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function openInvoices(snapshot: AgentSnapshot | null) {
  if (!snapshot) return [];
  return snapshot.invoices.filter(
    (invoice) => invoice.status === "pending" || invoice.status === "overdue"
  );
}

function snapshotLine(snapshot: AgentSnapshot | null) {
  if (!snapshot) return "Connect your account so I can read your own ledger.";
  if (!snapshot.invoices.length && !snapshot.recent_transactions.length) {
    return "Your ledger has no records yet. Load demonstration data from the dashboard, or ask me to prepare your first payment request.";
  }
  return "";
}

function summaryReply(snapshot: AgentSnapshot | null) {
  if (!snapshot) {
    return "I can summarize payments once your account is connected.";
  }
  const empty = snapshotLine(snapshot);
  if (empty) return empty;

  const totals = snapshot.totals;
  const demo = snapshot.demo_data_present ? " This includes records labeled as demonstration data." : "";
  const lines = [
    `You have collected ${formatMoney(totals.received, snapshot.base_currency)} across ${totals.completed_payments} completed sandbox ${totals.completed_payments === 1 ? "payment" : "payments"}.`,
    `Outstanding right now is ${formatMoney(totals.outstanding, snapshot.base_currency)} across ${totals.open_documents} open ${totals.open_documents === 1 ? "document" : "documents"}.`,
    `Collection rate on invoices is ${totals.collection_rate}%.${demo}`,
  ];
  return lines.join("\n");
}

function pendingReply(snapshot: AgentSnapshot | null) {
  if (!snapshot) return "I need your account connection before I can list open payments.";
  const empty = snapshotLine(snapshot);
  if (empty) return empty;
  const open = openInvoices(snapshot);
  if (!open.length) {
    return "Nothing is open. Every invoice and payment request in your ledger is settled or cancelled.";
  }

  const lines = open.slice(0, 5).map((invoice) => {
    const due = invoice.due_date ? ` · due ${formatDateShort(invoice.due_date)}` : "";
    return `• ${invoice.number} · ${invoice.customer || "Unnamed customer"} · ${formatMoney(invoice.amount, invoice.currency)}${due} · ${invoice.status}`;
  });
  const extra = open.length > 5 ? `\nPlus ${open.length - 5} more in the payment requests page.` : "";
  return `You have ${open.length} open ${open.length === 1 ? "document" : "documents"}:\n${lines.join("\n")}${extra}`;
}

function analysisReply(snapshot: AgentSnapshot | null) {
  if (!snapshot) return "I can analyze cash flow once your account is connected.";
  const empty = snapshotLine(snapshot);
  if (empty) return empty;

  const monthly = snapshot.monthly.filter((point) => point.count > 0 || point.received > 0);
  const best = [...snapshot.monthly].sort((a, b) => b.received - a.received)[0];
  const latest = snapshot.monthly[snapshot.monthly.length - 1];
  const lines: string[] = [];
  if (best && best.received > 0) {
    lines.push(`${best.month} is your strongest month at ${formatMoney(best.received, snapshot.base_currency)}.`);
  }
  if (latest) {
    lines.push(
      latest.received > 0
        ? `${latest.month} has collected ${formatMoney(latest.received, snapshot.base_currency)} so far.`
        : `${latest.month} has no captured payments yet.`
    );
  }
  lines.push(
    snapshot.totals.outstanding > 0
      ? `${formatMoney(snapshot.totals.outstanding, snapshot.base_currency)} is outstanding. Clearing the oldest request first would improve cash flow the fastest.`
      : "No receivables are outstanding, so cash flow is clean this period."
  );
  if (monthly.length < 2 && snapshot.totals.completed_payments < 2) {
    lines.push("There is not enough history for a deep trend yet. A few more captured payments will make the pattern clearer.");
  }
  return lines.join("\n");
}

function reminderReply(snapshot: AgentSnapshot | null, text: string) {
  if (!snapshot) return { reply: "I need your account connection before I can send a reminder.", action: null as AgentActionPayload | null };
  const open = openInvoices(snapshot);
  if (!open.length) {
    return { reply: "There are no open invoices to remind anyone about.", action: null };
  }
  const mentioned = open.find((invoice) => text.toLowerCase().includes(invoice.number.toLowerCase()));
  const overdue = open.find((invoice) => invoice.status === "overdue");
  const target = mentioned ?? overdue ?? open[0];

  const due = target.due_date ? ` due ${formatDateShort(target.due_date)}` : "";
  const contact = target.customer
    ? ` Add or confirm the email for ${target.customer}, then confirm and the reminder is sent through Resend.`
    : " Add the customer email in the preview, then confirm.";
  return {
    reply: `I prepared a reminder for ${target.number} · ${formatMoney(target.amount, target.currency)}${due}.${contact} No email leaves the server until you approve.`,
    action: {
      type: "send_reminder" as const,
      invoice_id: target.id,
      invoice_number: target.number,
      customer_name: target.customer || null,
      customer_email: null,
      amount: target.amount,
      currency: target.currency,
      description: `Payment reminder for ${target.number}`,
      due_date: target.due_date,
    },
  };
}

export function runLocalAgent(
  message: string,
  snapshot: AgentSnapshot | null,
  now = new Date()
): LocalAgentResult {
  const text = message.trim();
  const lower = text.toLowerCase();

  const createIntent: AgentIntent | null = /\b(create|make|draft|prepare|new|send|raise)\b/.test(lower)
    ? /payment request|\bcharge\b|\bcollect\b/.test(lower)
      ? "create_payment_request"
      : /\binvoice\b|\bbill\b/.test(lower)
        ? "create_invoice"
        : null
    : null;

  if (createIntent) {
    const { amount, currency } = parseAmount(text);
    const dueDate = parseDueDate(text, now);
    const email = extractEmail(text);
    const subject = parseSubject(text);
    const action: AgentActionPayload = {
      type: createIntent,
      amount,
      currency,
      customer_name: subject.customer_name,
      customer_email: email,
      description: subject.description,
      due_date: dueDate,
    };

    const label = createIntent === "create_invoice" ? "invoice" : "payment request";
    const parts: string[] = [];
    if (amount) {
      parts.push(
        `I prepared a ${formatMoney(amount, currency)} ${label}${subject.customer_name ? ` for ${subject.customer_name}` : ""}${dueDate ? ` due ${formatDateShort(dueDate)}` : ""}.`
      );
    } else {
      parts.push(`I started a draft ${label}${subject.customer_name ? ` for ${subject.customer_name}` : ""}.`);
    }
    if (subject.description) parts.push(`Scope: ${subject.description}.`);
    const missing = [
      !amount ? "amount" : null,
      !subject.customer_name ? "customer name" : null,
      !subject.description ? "description" : null,
    ].filter(Boolean);
    parts.push(
      missing.length
        ? `Add the ${missing.join(" and ")} in the preview, then confirm to save it. Nothing is sent or charged without your approval.`
        : "Review the preview and confirm to save it. Nothing is sent or charged without your approval."
    );

    return {
      reply: parts.join(" "),
      intent: createIntent,
      action,
      suggestions: [
        "Which invoices are still pending?",
        "Summarize my payment activity",
        "Set the due date to 14 days",
      ],
    };
  }

  if (/\b(remind|reminder|follow up|followup|chase)\b/.test(lower)) {
    const reminder = reminderReply(snapshot, text);
    return {
      reply: reminder.reply,
      intent: "send_reminder",
      action: reminder.action,
      suggestions: ["Show open invoices", "Summarize my payment activity"],
    };
  }

  if (/\b(pending|unpaid|outstanding|open invoices?|still owe|owed)\b/.test(lower)) {
    return {
      reply: pendingReply(snapshot),
      intent: "pending_payments",
      action: null,
      suggestions: ["Send a reminder", "Summarize my payment activity", "Analyze my payment trends"],
    };
  }

  if (/\b(analy[sz]e|trend|cash ?flow|insight|pattern|forecast)\b/.test(lower)) {
    return {
      reply: analysisReply(snapshot),
      intent: "analyze_cashflow",
      action: null,
      suggestions: ["Which invoices are still pending?", "Summarize my payment activity"],
    };
  }

  if (/\b(summari[sz]e|summary|overview|activity|how much|received|earned|paid)\b/.test(lower)) {
    return {
      reply: summaryReply(snapshot),
      intent: "summarize",
      action: null,
      suggestions: ["Analyze my payment trends", "Which invoices are still pending?", "Create a payment request"],
    };
  }

  return {
    reply:
      "I can prepare invoices and payment requests, review open balances, summarize collected payments, analyze cash flow, and draft reminders. Ask for an action in plain language and I will show a preview before anything runs.",
    intent: "help",
    action: null,
    suggestions: [
      "Create a $250 payment request for website development, due in seven days",
      "Which invoices are still pending?",
      "Analyze my payment trends",
    ],
  };
}
