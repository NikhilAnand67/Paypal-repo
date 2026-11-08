# PayPilot AI

**Think smarter. Pay faster. Stay in control.**

PayPilot AI is an AI financial operations assistant for freelancers, creators, students, and small teams. You describe work in plain language, the agent prepares an invoice or payment request, and nothing executes until you explicitly confirm it. Real PayPal Sandbox orders handle checkout. Every dashboard figure comes from your own stored records.

Built for **Build What's Next with PayPal and AI**.

---

## What works

- **Landing, login, guided demo, legal pages, branded 404, OG image**
- **AI agent workspace** with conversation history, suggested prompts, action previews, editable fields, explicit confirmation, decline flow, and execution results
- **Invoices and payment requests** created from the UI or the agent, with PDF download, search, filters, status actions, and PayPal checkout
- **Transactions** ledger showing only stored PayPal records, with order/capture/payer details
- **Analytics** built from real ledger rows, with multi-currency records excluded rather than converted at invented rates
- **Notifications**, **search command palette**, and **security/audit activity**
- **Settings** for profile, avatar, currency, notification preferences, auth provider, integration status, and sign out
- **Guided 12-step demo** and clearly labeled, isolated demo data

The agent has a deterministic local reasoning fallback, so it still prepares structured actions when Gemini is not configured. Gemini adds richer wording and intent handling when a key is present.

---

## Stack

Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, Framer Motion, React Three Fiber / Three.js, Recharts, Radix primitives, Lucide, Zod, Supabase (PostgreSQL, Auth, RLS), PayPal REST Orders v2, PayPal JS SDK, Google Gemini, Resend, `pdf-lib`, Vitest.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Open http://localhost:3000.

```bash
npm run lint      # ESLint
npm test          # Vitest unit suite
npm run build     # production build
```

---

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL used in emails, PayPal returns, and metadata |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (safe in the browser with RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Never expose or prefix with `NEXT_PUBLIC` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal JS SDK client id (public) |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Server only Orders API credentials |
| `PAYPAL_BASE_URL` | `https://api-m.sandbox.paypal.com` |
| `PAYPAL_WEBHOOK_ID` | Sandbox webhook id used for signature verification |
| `PAYPAL_ALLOW_LIVE` | Leave `false`. Live hosts are refused unless explicitly opted in |
| `GEMINI_API_KEY` | Server only Gemini key |
| `GEMINI_MODEL` | Defaults to `gemini-2.5-flash` |
| `RESEND_API_KEY` | Server only Resend key |
| `EMAIL_FROM` | Verified sender, for example `PayPilot AI <billing@yourdomain.com>` |

`.env.local` is ignored by git. Never commit the database password, service role key, PayPal secret, Gemini key, or Resend key.

---

## 1. Supabase

1. Create a project at https://supabase.com.
2. Open **SQL Editor** and run the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates `profiles`, `invoices`, `transactions`, `agent_conversations`, `agent_messages`, `agent_actions`, `notifications`, and `audit_logs`, enables and forces row level security on each table, adds owner scoped policies, an `updated_at` trigger, and a trigger that creates a profile after sign up.
3. Copy the project URL and publishable key into `.env.local`.
4. Under **Authentication → Providers**, enable Email, Google, and GitHub as needed.
5. Under **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:3000` for development, your deployed URL in production
   - Redirect URLs: `http://localhost:3000/auth/callback` and `https://your-app.vercel.app/auth/callback`

Google and GitHub OAuth credentials live in the Supabase dashboard. In Google Cloud Console use `https://<project-ref>.supabase.co/auth/v1/callback` as the authorized redirect URI. GitHub OAuth apps use the same callback.

For production email confirmation, configure your SMTP provider under **Authentication → Emails**. For quick local testing you can disable email confirmation, but that is not intended for production.

The publishable key is intended for frontend use only because the schema enforces RLS.

---

## 2. PayPal Sandbox

1. Create an app at https://developer.paypal.com/dashboard/applications/sandbox.
2. Copy the client id and secret into `.env.local`, and the same client id into `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
3. Keep `PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com`.
4. Create a sandbox webhook pointing to `https://<your-app>/api/paypal/webhook` and subscribe to:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `PAYMENT.CAPTURE.REVERSED`
5. Copy the webhook id into `PAYPAL_WEBHOOK_ID`.
6. For local webhook testing use a tunnel (for example ngrok) and point the sandbox webhook at the public URL.

The server creates orders from its own stored amount, never from a browser supplied amount. Captures are reconciled against the PayPal response, and webhook signatures are verified with the PayPal verification API.

Use sandbox buyer accounts from the PayPal dashboard to complete checkout. No live funds move.

---

## 3. Gemini

Create an API key at https://aistudio.google.com/app/apikey and set `GEMINI_API_KEY`. Requests run server side with a strict JSON response schema. If the key is missing or the call fails, the deterministic local agent handles the message and the UI continues to work.

---

## 4. Resend

Verify a sending domain at https://resend.com, then set `RESEND_API_KEY` and `EMAIL_FROM`. When Resend is not configured, email delivery is skipped cleanly and the UI reports that the email was not sent. All interpolated content is HTML escaped.

---

## Demo script

1. Open `/demo` and walk the 12 step tour. It is available without an account and labels preview values as illustrative.
2. Sign in, then load demo data from the dashboard when the guided demo offers it. Demo rows are marked `is_demo` and can be cleared separately from real sandbox records.
3. Open `/ai-agent` and send:
   > Create a $250 payment request for my website development client, due in seven days.
4. The agent returns an action preview. Open it, add the customer name (and optionally the email), then choose **Confirm and run**.
5. Open the created record and choose **Collect with PayPal** to launch the sandbox checkout. Complete it with a sandbox buyer.
6. Follow the webhook and transaction record into `/transactions` and `/analytics`.
7. Ask a follow up such as "Which invoices are still pending?" or "Analyze my payment trends".

---

## Security model

- **Explicit confirmation boundary.** The AI only writes an `agent_actions` proposal. `/api/ai/execute-action` requires `confirmed: true` and re-validates the action on the server within a 24 hour window.
- **Server trusted amounts.** Browser supplied amounts are validated with Zod and are never used directly to create a PayPal order or capture.
- **Row level security.** Every table is owner scoped and forced through RLS. The service role key stays server only and is never required for normal user requests.
- **OAuth and sessions.** PKCE with `@supabase/ssr`, HTTP only cookies, server verified users, and same origin checks on state changing API routes.
- **Rate limiting and audit logs.** Sensitive endpoints are rate limited, and financial actions, demo changes, and profile updates are written to the audit log.
- **Webhook verification.** Signatures are verified before any transaction, invoice, or notification is updated. An unconfigured webhook refuses to process events.
- **Sandbox only.** Live PayPal endpoints are refused unless `PAYPAL_ALLOW_LIVE=true` is deliberately set.
- **No fabricated analytics.** Charts, KPIs, and insights read stored records. Currencies other than the base currency are excluded with a visible note instead of converted at an invented rate.

---

## Verification status

Verified locally on 2026-11-08:

- `npm run lint` passes with no warnings or errors.
- `npx tsc --noEmit` passes.
- `npm run build` completes and emits every route.
- `npm test` passes 26 tests covering local agent parsing, the confirmation schema, calendar/amount validation, and analytics currency handling.
- Landing, login, demo, legal, 404, and auth redirect flows were checked in the browser, including a headless 390px viewport check with no horizontal overflow and no console errors.
- API guards return `401` for unauthenticated requests. The webhook returns `503` when unconfigured. `/api/config/status` reports integration availability truthfully.

Not yet testable in this environment because credentials or the database schema are missing:

- The Supabase migration has not been applied to the connected project, so authenticated pages, RLS enforcement, profile creation, notifications, and the agent's stored conversations could not be exercised end to end.
- Google and GitHub OAuth were not configured, so those provider round trips are untested.
- PayPal client credentials and webhook id are empty, so order creation, sandbox checkout, capture reconciliation, and webhook handling are untested.
- Gemini and Resend keys are empty. The local agent fallback and graceful email skip are the active paths, while the remote paths are implemented but unverified.

Each integration fails closed and reports its state in `/settings` and `/api/config/status`.

---

## Deploy to Vercel

1. Push the repository (without `.env.local`).
2. Import it in Vercel and add every variable above under **Settings → Environment Variables**.
3. Set `NEXT_PUBLIC_APP_URL` to the deployed origin.
4. Deploy, then add the deployed `/auth/callback` URL to Supabase redirect URLs and the deployed `/api/paypal/webhook` URL to PayPal.
5. Keep `PAYPAL_BASE_URL` pointed at sandbox and `PAYPAL_ALLOW_LIVE` unset or `false`.

---

## Known limitations

- This is a hackathon Sandbox demonstration. It does not move live money, store card details, or provide tax, accounting, or legal advice.
- Multi currency records are intentionally excluded from aggregate analytics. Cross currency conversion is out of scope.
- The local agent is a deterministic parser for common invoice and payment request phrasing. Gemini improves coverage when configured.
- Recurring billing, partial payments, and refunds initiated from the app are out of scope. Refund and reversal webhooks are recorded when PayPal sends them.
