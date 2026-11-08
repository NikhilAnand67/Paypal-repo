-- PayPilot AI :: initial schema
-- Apply in Supabase SQL editor or with `supabase db push`.
-- Every user owned table is protected by row level security.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create a profile for every auth user (OAuth, email, anonymous).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, full_name, avatar_url, auth_provider, provider_user_id
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
    new.raw_user_meta_data ->> 'sub'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        auth_provider = coalesce(public.profiles.auth_provider, excluded.auth_provider),
        provider_user_id = coalesce(public.profiles.provider_user_id, excluded.provider_user_id),
        updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text,
  avatar_url text,
  auth_provider text not null default 'email',
  provider_user_id text,
  currency text not null default 'USD'
    check (currency in ('USD','EUR','GBP','CAD','AUD','JPY','CHF','SEK','NZD','SGD','HKD')),
  email_notifications boolean not null default true,
  payment_notifications boolean not null default true,
  security_alerts boolean not null default true,
  marketing_updates boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'invoice' check (kind in ('invoice','payment_request')),
  invoice_number text not null,
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_email text,
  description text not null default '' check (char_length(description) <= 1200),
  notes text default '' check (char_length(notes) <= 2000),
  amount numeric(12,2) not null check (amount > 0 and amount <= 1000000),
  currency text not null default 'USD'
    check (currency in ('USD','EUR','GBP','CAD','AUD','JPY','CHF','SEK','NZD','SGD','HKD')),
  due_date date,
  status text not null default 'draft'
    check (status in ('draft','pending','paid','overdue','cancelled')),
  paypal_order_id text,
  paypal_invoice_id text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  paypal_order_id text unique,
  paypal_capture_id text unique,
  paypal_payer_id text,
  amount numeric(12,2) not null check (amount > 0 and amount <= 1000000),
  currency text not null default 'USD'
    check (currency in ('USD','EUR','GBP','CAD','AUD','JPY','CHF','SEK','NZD','SGD','HKD')),
  status text not null default 'created'
    check (status in ('created','approved','completed','failed','refunded')),
  payment_provider text not null default 'paypal',
  payment_description text not null default '' check (char_length(payment_description) <= 500),
  failure_reason text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agent_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null check (char_length(content) <= 20000),
  action_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.agent_conversations (id) on delete set null,
  action_type text not null
    check (action_type in ('create_invoice','create_payment_request','send_reminder','collect_payment')),
  action_payload jsonb not null,
  execution_status text not null default 'pending_confirmation'
    check (execution_status in ('pending_confirmation','executed','declined','failed','expired')),
  confirmation_timestamp timestamptz,
  executed_at timestamptz,
  result_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) <= 160),
  message text not null check (char_length(message) <= 1000),
  notification_type text not null default 'system'
    check (notification_type in ('payment','invoice','security','system','reminder')),
  link text,
  is_read boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) <= 120),
  resource_type text,
  resource_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists invoices_user_created_idx on public.invoices (user_id, created_at desc);
create index if not exists invoices_user_status_idx on public.invoices (user_id, status);
create index if not exists invoices_user_kind_idx on public.invoices (user_id, kind);
create index if not exists invoices_due_date_idx on public.invoices (user_id, due_date) where due_date is not null;
create index if not exists transactions_user_created_idx on public.transactions (user_id, created_at desc);
create index if not exists transactions_user_status_idx on public.transactions (user_id, status);
create index if not exists transactions_invoice_idx on public.transactions (invoice_id);
create index if not exists agent_conversations_user_idx on public.agent_conversations (user_id, updated_at desc);
create index if not exists agent_messages_conversation_idx on public.agent_messages (conversation_id, created_at);
create index if not exists agent_actions_user_idx on public.agent_actions (user_id, created_at desc);
create index if not exists agent_actions_status_idx on public.agent_actions (user_id, execution_status);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where is_read = false;
create index if not exists audit_logs_user_idx on public.audit_logs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists invoices_touch_updated_at on public.invoices;
create trigger invoices_touch_updated_at
  before update on public.invoices
  for each row execute function public.touch_updated_at();

drop trigger if exists transactions_touch_updated_at on public.transactions;
create trigger transactions_touch_updated_at
  before update on public.transactions
  for each row execute function public.touch_updated_at();

drop trigger if exists agent_conversations_touch_updated_at on public.agent_conversations;
create trigger agent_conversations_touch_updated_at
  before update on public.agent_conversations
  for each row execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.invoices enable row level security;
alter table public.transactions enable row level security;
alter table public.agent_conversations enable row level security;
alter table public.agent_messages enable row level security;
alter table public.agent_actions enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

alter table public.profiles force row level security;
alter table public.invoices force row level security;
alter table public.transactions force row level security;
alter table public.agent_conversations force row level security;
alter table public.agent_messages force row level security;
alter table public.agent_actions force row level security;
alter table public.notifications force row level security;
alter table public.audit_logs force row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "invoices_select_own" on public.invoices;
create policy "invoices_select_own" on public.invoices
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "invoices_insert_own" on public.invoices;
create policy "invoices_insert_own" on public.invoices
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "invoices_update_own" on public.invoices;
create policy "invoices_update_own" on public.invoices
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "invoices_delete_own" on public.invoices;
create policy "invoices_delete_own" on public.invoices
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "agent_conversations_select_own" on public.agent_conversations;
create policy "agent_conversations_select_own" on public.agent_conversations
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "agent_conversations_insert_own" on public.agent_conversations;
create policy "agent_conversations_insert_own" on public.agent_conversations
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "agent_conversations_update_own" on public.agent_conversations;
create policy "agent_conversations_update_own" on public.agent_conversations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "agent_conversations_delete_own" on public.agent_conversations;
create policy "agent_conversations_delete_own" on public.agent_conversations
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "agent_messages_select_own" on public.agent_messages;
create policy "agent_messages_select_own" on public.agent_messages
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "agent_messages_insert_own" on public.agent_messages;
create policy "agent_messages_insert_own" on public.agent_messages
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "agent_messages_delete_own" on public.agent_messages;
create policy "agent_messages_delete_own" on public.agent_messages
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "agent_actions_select_own" on public.agent_actions;
create policy "agent_actions_select_own" on public.agent_actions
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "agent_actions_insert_own" on public.agent_actions;
create policy "agent_actions_insert_own" on public.agent_actions
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "agent_actions_update_own" on public.agent_actions;
create policy "agent_actions_update_own" on public.agent_actions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own" on public.notifications
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "audit_logs_select_own" on public.audit_logs;
create policy "audit_logs_select_own" on public.audit_logs
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "audit_logs_insert_own" on public.audit_logs;
create policy "audit_logs_insert_own" on public.audit_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- Audit records are append only for clients.
revoke update, delete on public.audit_logs from authenticated;

-- ---------------------------------------------------------------------------
-- Grants (Supabase API roles)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.agent_conversations to authenticated;
grant select, insert, delete on public.agent_messages to authenticated;
grant select, insert, update on public.agent_actions to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert on public.audit_logs to authenticated;

revoke all on public.profiles, public.invoices, public.transactions,
  public.agent_conversations, public.agent_messages, public.agent_actions,
  public.notifications, public.audit_logs from anon;

-- ---------------------------------------------------------------------------
-- Realtime (notifications and transactions for live dashboards)
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------

comment on table public.invoices is 'Invoices and payment requests. kind separates the two workflows.';
comment on table public.transactions is 'PayPal order ledger. Writes from webhooks use the service role.';
comment on table public.agent_actions is 'AI proposed actions. Financial execution requires an explicit confirmation.';
comment on table public.audit_logs is 'Append only security and financial audit trail.';
