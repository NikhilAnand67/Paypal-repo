export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Currency =
  | "USD"
  | "EUR"
  | "GBP"
  | "CAD"
  | "AUD"
  | "JPY"
  | "CHF"
  | "SEK"
  | "NZD"
  | "SGD"
  | "HKD";

export type InvoiceKind = "invoice" | "payment_request";
export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";
export type TransactionStatus = "created" | "approved" | "completed" | "failed" | "refunded";
export type AgentActionType =
  | "create_invoice"
  | "create_payment_request"
  | "send_reminder"
  | "collect_payment";
export type AgentExecutionStatus =
  | "pending_confirmation"
  | "executed"
  | "declined"
  | "failed"
  | "expired";
export type NotificationType = "payment" | "invoice" | "security" | "system" | "reminder";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  auth_provider: string;
  provider_user_id: string | null;
  currency: Currency;
  email_notifications: boolean;
  payment_notifications: boolean;
  security_alerts: boolean;
  marketing_updates: boolean;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  user_id: string;
  kind: InvoiceKind;
  invoice_number: string;
  customer_name: string;
  customer_email: string | null;
  description: string;
  notes: string | null;
  amount: number;
  currency: Currency;
  due_date: string | null;
  status: InvoiceStatus;
  paypal_order_id: string | null;
  paypal_invoice_id: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  invoice_id: string | null;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  paypal_payer_id: string | null;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  payment_provider: string;
  payment_description: string;
  failure_reason: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type AgentConversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type AgentMessage = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  action_metadata: ActionMetadata;
  created_at: string;
};

export type AgentAction = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  action_type: AgentActionType;
  action_payload: AgentActionPayload;
  execution_status: AgentExecutionStatus;
  confirmation_timestamp: string | null;
  executed_at: string | null;
  result_payload: Json | null;
  created_at: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  link: string | null;
  is_read: boolean;
  is_demo: boolean;
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Json;
  created_at: string;
};

/**
 * A financial action the agent proposes. Nothing here is executed until the
 * authenticated user confirms it through /api/ai/execute-action.
 */
export interface AgentActionPayload {
  type: AgentActionType;
  amount?: number | null;
  currency?: Currency;
  customer_name?: string | null;
  customer_email?: string | null;
  description?: string | null;
  due_date?: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
}

export type AgentIntent =
  | "create_invoice"
  | "create_payment_request"
  | "summarize"
  | "pending_payments"
  | "analyze_cashflow"
  | "send_reminder"
  | "help"
  | "other";

export interface AgentResultSummary {
  invoiceId?: string;
  kind?: InvoiceKind;
  status?: string;
  paymentRequestUrl?: string;
  emailSent?: boolean;
  message?: string;
}

export interface ActionMetadata {
  action_id?: string;
  status?: AgentExecutionStatus | "none";
  proposal?: AgentActionPayload | null;
  result?: AgentResultSummary | null;
  error?: string | null;
  engine?: "gemini" | "local";
}

export interface AgentProposal {
  actionId: string;
  payload: AgentActionPayload;
  status: AgentExecutionStatus;
  message: string;
  suggestions: string[];
  engine: "gemini" | "local";
}

export interface AgentChatResult {
  conversationId: string;
  conversationTitle: string;
  reply: string;
  intent: AgentIntent;
  action: AgentProposal | null;
  suggestions: string[];
  engine: "gemini" | "local";
  savedAt: string;
}

export type AgentSnapshot = {
  generated_at: string;
  base_currency: Currency;
  totals: {
    received: number;
    outstanding: number;
    completed_payments: number;
    open_documents: number;
    paid_invoices: number;
    collection_rate: number;
  };
  monthly: { month: string; received: number; outstanding: number; count: number }[];
  invoices: {
    id: string;
    type: InvoiceKind;
    number: string;
    customer: string;
    amount: number;
    currency: Currency;
    status: string;
    due_date: string | null;
    demo: boolean;
  }[];
  recent_transactions: {
    id: string;
    amount: number;
    currency: Currency;
    status: string;
    description: string;
    created_at: string;
    demo: boolean;
  }[];
  demo_data_present: boolean;
};

export interface Insight {
  id: string;
  tone: "positive" | "neutral" | "warning";
  title: string;
  detail: string;
  action?: { label: string; href: string };
}

export interface MonthlyPoint {
  month: string;
  label: string;
  received: number;
  pending: number;
  count: number;
}

export interface AnalyticsSummary {
  baseCurrency: Currency;
  totalReceived: number;
  completedCount: number;
  pendingAmount: number;
  pendingRequestCount: number;
  openInvoiceCount: number;
  paidInvoiceCount: number;
  invoiceTotal: number;
  collectionRate: number;
  averagePayment: number;
  statusBreakdown: { status: TransactionStatus; count: number; amount: number }[];
  monthly: MonthlyPoint[];
  topCustomers: { name: string; amount: number; count: number }[];
  excludedCurrencyCount: number;
  hasData: boolean;
  hasDemoData: boolean;
}

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<
        Profile,
        {
          id: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          auth_provider?: string;
          provider_user_id?: string | null;
          currency?: Currency;
          email_notifications?: boolean;
          payment_notifications?: boolean;
          security_alerts?: boolean;
          marketing_updates?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<Profile, "id">>
      >;
      invoices: TableDef<
        Invoice,
        {
          id?: string;
          user_id: string;
          kind?: InvoiceKind;
          invoice_number: string;
          customer_name: string;
          customer_email?: string | null;
          description?: string;
          notes?: string | null;
          amount: number;
          currency?: Currency;
          due_date?: string | null;
          status?: InvoiceStatus;
          paypal_order_id?: string | null;
          paypal_invoice_id?: string | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<Invoice, "id" | "user_id">>
      >;
      transactions: TableDef<
        Transaction,
        {
          id?: string;
          user_id: string;
          invoice_id?: string | null;
          paypal_order_id?: string | null;
          paypal_capture_id?: string | null;
          paypal_payer_id?: string | null;
          amount: number;
          currency?: Currency;
          status?: TransactionStatus;
          payment_provider?: string;
          payment_description?: string;
          failure_reason?: string | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<Transaction, "id" | "user_id">>
      >;
      agent_conversations: TableDef<
        AgentConversation,
        {
          id?: string;
          user_id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<AgentConversation, "id" | "user_id">>
      >;
      agent_messages: TableDef<
        AgentMessage,
        {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          action_metadata?: ActionMetadata;
          created_at?: string;
        },
        Partial<Omit<AgentMessage, "id" | "user_id">>
      >;
      agent_actions: TableDef<
        AgentAction,
        {
          id?: string;
          user_id: string;
          conversation_id?: string | null;
          action_type: AgentActionType;
          action_payload: AgentActionPayload;
          execution_status?: AgentExecutionStatus;
          confirmation_timestamp?: string | null;
          executed_at?: string | null;
          result_payload?: Json | null;
          created_at?: string;
        },
        Partial<Omit<AgentAction, "id" | "user_id">>
      >;
      notifications: TableDef<
        AppNotification,
        {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          notification_type?: NotificationType;
          link?: string | null;
          is_read?: boolean;
          is_demo?: boolean;
          created_at?: string;
        },
        Partial<Omit<AppNotification, "id" | "user_id">>
      >;
      audit_logs: TableDef<
        AuditLog,
        {
          id?: string;
          user_id: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json;
          created_at?: string;
        },
        Partial<Omit<AuditLog, "id">>
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
