# Gift Idea Finder (`giftr`)

A private, ephemeral gift-curation workspace for a small circle of friends. Turn a
privacy-safe recipient brief and budget range into **5 gift ideas**, accept/reject cards,
refill only rejected slots, then lock **2–3 finalists** with a “Why it fits” note and copy
or share the shortlist.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS 3**,
**`lucide-react`**, and **Vitest**.

> **Privacy first:** use a nickname or persona label only. Never enter full names, street
> addresses, phone numbers, or sensitive personal data. Nothing is stored in a database,
> and refreshing the page clears the workspace.

---

## Features

- **Lightweight friend auth** — allowlisted email + one of several **per-friend invite
  codes**, exchanged for a **7-day signed `HttpOnly` cookie** (`giftr_session`,
  HMAC-SHA-256). Remove a single code to revoke one friend without affecting everyone.
- **Guided intake** — quick-start presets, occasion chips + custom occasion, min/max budget,
  INR/USD/EUR/GBP or custom currency, likes, and collapsible optional context.
- **Exclusions that stick** — “Already owns” and “Do not want” each have 8 suggestion chips
  plus a free-text add field.
- **5-slot board** — accept up to 3, reject with optional reason tags, and **Replace rejected**
  to refill only rejected slots while accepted cards stay pinned.
- **Honest link handling** — the backend never fetches or validates URLs. Every card shows a
  companion Google search link and a prominent **“Verify link & live price yourself before
  buying.”** notice.
- **Final shortlist (2–3)** — editable “Why it fits” note, plaintext preview, **Copy Summary**,
  and **Share** via `navigator.share` with a clipboard fallback.
- **Responsive** — single-column mobile layouts, collapsible optional details, sticky bottom
  action bars on the board and shortlist, and a 3-column desktop board.
- **Provider-agnostic LLM layer** — Gemini by default, an OpenAI-compatible adapter, and a
  deterministic local stub for demos/tests.
- **No database** — brief, cards, finalists, and notes live in React memory for the session.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.4 (App Router, route handlers) |
| UI | React 19.3, Tailwind CSS 3.4, `lucide-react` |
| Language | TypeScript 5.9 (strict) |
| Auth | HMAC-signed cookie via Web Crypto (`crypto.subtle`) |
| LLM | Gemini (`generativelanguage.googleapis.com`), OpenAI-compatible, or stub |
| Tests | Vitest 3 (unit + route-handler integration) |
| Deploy | Vercel (primary), Docker/Node, Cloudflare via OpenNext |

---

## Quick start (local)

### Prerequisites

- Node.js **20.9+** (22 LTS recommended)
- npm 10+

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Generate a signing secret:

```bash
openssl rand -base64 48
```

Edit `.env.local`:

```dotenv
ALLOWED_EMAILS=you@example.com,friend@example.com
INVITE_CODES=ALEX-2026,SAM-2026,PRIYA-2026
SESSION_SECRET=<paste-the-generated-secret>

# Easiest local demo: no API key required.
LLM_PROVIDER=stub
```

Give each friend one code from `INVITE_CODES`. They still need an allowlisted email, so
the email list and the code list work together as two independent gates.

To use real Gemini ideas instead:

```dotenv
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-key-from-google-ai-studio
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Run

```bash
npm run dev
```

Open <http://localhost:3000>, sign in with one of the emails in `ALLOWED_EMAILS` and any
active code from `INVITE_CODES`.

### 4. Try the flow

1. Pick a quick-start preset (or fill the brief).
2. Click **Find 5 Gift Ideas**.
3. Accept 2–3 cards; reject another and click **Replace rejected**.
4. Open the shortlist, add a note, then **Copy summary** or **Share**.

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `ALLOWED_EMAILS` | Yes | Comma-separated allowlist; compared case-insensitively. |
| `INVITE_CODES` | Yes | Comma-separated list of per-friend codes; compared case-sensitively. Remove a code to revoke it. |
| `INVITE_CODE` | No | Legacy single code. Still supported; ignored when `INVITE_CODES` is set. |
| `SESSION_SECRET` | Yes | Long random string used to sign the 7-day cookie. Rotate to invalidate all sessions. |
| `LLM_PROVIDER` | No | `gemini` (default), `openai`, or `stub`. |
| `GEMINI_API_KEY` | If Gemini | Server-only Google AI Studio key. |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.5-flash`. |
| `OPENAI_API_KEY` | If OpenAI | Server-only key for an OpenAI-compatible endpoint. |
| `OPENAI_BASE_URL` | No | Defaults to `https://api.openai.com/v1`. |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini`. |
| `IDEAS_RATE_LIMIT` | No | Idea generations per session per window (default `8`). |
| `IDEAS_RATE_WINDOW_SECONDS` | No | Rate-limit window in seconds (default `600`). |

**Never** prefix secrets with `NEXT_PUBLIC_`. Only server route handlers read them.

---

## How it works

```text
AccessGate ──POST /api/auth/login──► signed HttpOnly cookie (7 days)
    │
Workspace (React memory: brief, 5 cards, finalists, note)
    ├── IntakeForm  ──POST /api/ideas/round──► LLM adapter ──► 5 ideas
    ├── IdeaGrid    ──accept / reject / replace rejected──► still 5 slots
    └── Shortlist   ──copy / share──► plaintext summary
```

- **Auth:** `src/lib/auth.ts` validates an allowlisted email plus any active code from
  `INVITE_CODES` (or the legacy `INVITE_CODE`), then signs `{ email, exp }` with
  HMAC-SHA-256. The cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=604800`, and
  `Secure` in production.
- **Session guard:** every ideas request verifies the cookie and rate-limits by email.
- **Ideas:** the route validates the payload, calls the selected provider, assigns the
  requested slot numbers, and always builds a Google search URL. It does **not** probe or
  validate `exactUrl`.
- **State:** no persistence. Refresh = fresh workspace. Reset optionally keeps currency and
  location defaults.

### API summary

`POST /api/auth/login`

```json
{ "email": "friend@example.com", "inviteCode": "WARM-GIFT-2026" }
```

`POST /api/ideas/round` (requires the session cookie)

```json
{
  "nickname": "The Coffee Purist",
  "occasion": "Birthday",
  "currency": "INR",
  "budgetMin": 1500,
  "budgetMax": 4000,
  "likes": "pour-over coffee, tactile stationery",
  "age": "late 20s",
  "gender": "",
  "location": "Bengaluru",
  "job": "designer",
  "owns": ["French press"],
  "avoid": ["Gift cards"],
  "slots": [2, 4],
  "acceptedTitles": ["Brass desk tray"],
  "rejectedTitles": ["Scented candle"]
}
```

Response:

```json
{
  "ideas": [
    {
      "slot": 2,
      "title": "Stoneware Pour-Over Set",
      "description": "A hand-glazed dripper and carafe.",
      "estimatedPrice": 3200,
      "currency": "INR",
      "whyItFits": "Matches the pour-over ritual.",
      "exactUrl": "https://example.com/product",
      "searchUrl": "https://www.google.com/search?q=..."
    }
  ],
  "provider": "gemini",
  "generatedAt": "2026-11-21T10:00:00.000Z"
}
```

Errors: `400` validation, `401` session expired, `413` body too large, `429` rate limited
(with `Retry-After`), `502` provider failure, `503` provider not configured.

`POST /api/auth/logout` clears the cookie.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server at <http://localhost:3000>. |
| `npm run build` | Production build (type-checked by Next). |
| `npm start` | Serve the production build. |
| `npm run lint` | ESLint 9 with Next.js rules. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run test` | Run the Vitest suite once. |
| `npm run test:watch` | Watch mode. |
| `npm run verify` | Lint + typecheck + tests + production build. |

---

## Testing

The suite has **67 tests across 8 files**, covering:

| File | Coverage |
| --- | --- |
| `tests/auth.test.ts` | Allowlist, per-friend invite-code list, legacy fallback/precedence, revocation, token round-trip, tampering, expiry, malformed tokens. |
| `tests/login-route.test.ts` | Valid login + cookie attributes, any active code, revoked code, bad email/code, malformed JSON, missing secret. |
| `tests/ideas-route.test.ts` | 401 without cookie, validation, default/selected slots, rate limit, 503 provider config, 413 body size. |
| `tests/rate-limit.test.ts` | Sliding window, per-key isolation, expiry, reset, env parsing. |
| `tests/validation.test.ts` | Budget rules, slot rules, trimming/deduping, array limits, body size. |
| `tests/brief.test.ts` | Form validation, custom currency, active-brief normalization. |
| `tests/summary.test.ts` | Shortlist text, prices, links, note, verification reminder, currency fallbacks. |
| `tests/stub.test.ts` | Count, budget range, exclusions, determinism. |

Run:

```bash
npm run test
npm run verify
```

### Manual QA checklist

- [ ] `/` shows the access gate with the privacy reminder.
- [ ] Wrong/removed invite code is rejected; any active code works with an allowlisted email.
- [ ] Presets fill the brief; custom occasion/currency work.
- [ ] Optional details collapse on mobile and are visible on desktop.
- [ ] “Already owns” / “Do not want” chips toggle and custom items can be added/removed.
- [ ] Generate 5 ideas; accept 2, reject 1; accepted cards remain after **Replace rejected**.
- [ ] Accepting a 4th card is blocked with a clear message.
- [ ] Shortlist is locked until 2 accepted; note updates the preview.
- [ ] Copy summary and Share work (Share falls back to clipboard).
- [ ] Reset clears the board; “keep currency & location” preserves those two fields.
- [ ] Mobile: sticky action bars, no horizontal overflow, tap targets usable.
- [ ] Sign out clears the cookie and returns to the gate.

---

## Build & deploy

### Option A — Vercel (recommended, free tier)

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, **Add New → Project** and import the repo.
3. Framework preset: **Next.js** (auto-detected).
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Node.js: **22.x**
4. Add environment variables for **Production** (and Preview):
   `ALLOWED_EMAILS`, `INVITE_CODES`, `SESSION_SECRET`, `LLM_PROVIDER`, `GEMINI_API_KEY`
   (plus optional model/rate-limit values).
5. Deploy. Open the `*.vercel.app` URL and sign in.
6. Recommended: protect **Preview** deployments with Vercel Authentication so previews
   cannot burn LLM quota.

The app has no database and no migrations. Rotating `SESSION_SECRET` immediately signs
everyone out. Removing one code from `INVITE_CODES` revokes only that code for future
sign-ins; existing sessions last up to 7 days unless you rotate `SESSION_SECRET`.

### Managing per-friend invite codes

```dotenv
ALLOWED_EMAILS=alex@example.com,sam@example.com,priya@example.com
INVITE_CODES=ALEX-2026,SAM-2026,PRIYA-2026
```

- Give each friend one code. Codes are case-sensitive.
- To revoke Sam, delete `SAM-2026` and redeploy. Alex and Priya keep working.
- To cut off all active sessions immediately, rotate `SESSION_SECRET`.
- To block a friend's email as well, remove it from `ALLOWED_EMAILS`.

### Option B — Docker / any Node host

```bash
docker build -t giftr .
docker run --rm -p 3000:3000 --env-file .env.local giftr
```

Or run directly on a Node 22 host:

```bash
npm ci
npm run build
npm start
```

Put it behind HTTPS (platform-managed or Caddy/Nginx). The in-memory rate limiter is per
container; run one instance or add Redis for a shared limit.

### Option C — Cloudflare Workers/Pages

Use `@opennextjs/cloudflare` and set the same environment variables as Worker secrets.
See [`design/DEPLOYMENT.md`](design/DEPLOYMENT.md) for the full deployment architecture,
free-tier cost model, observability, rollback, and go-live checklist.

---

## Security & privacy notes

- Secrets live only in server environment variables; no `NEXT_PUBLIC_` secrets exist.
- Session cookie is signed, `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Every active invite code is compared with a constant-time comparison; emails are normalized.
- API payloads are shape/size validated; errors are sanitized.
- The backend never fetches external URLs. The client only renders `http:`/`https:` links
  and always shows the search fallback plus the verification warning.
- No database, no analytics, no PII persistence. Recipient labels should be nicknames.
- Security headers (`nosniff`, `DENY` framing, referrer policy, permissions policy) are set
  in `next.config.ts`; API responses use `Cache-Control: no-store`.

### Known limitations

- **In-memory rate limiting** is best-effort across serverless instances. For a hard global
  limit, swap `src/lib/rate-limit.ts` for Upstash Redis or Vercel KV.
- **No refresh persistence** by design. If you want device-local refresh resilience, add
  `sessionStorage` hydration (still no server persistence).
- **Prices and links are estimates.** Always verify before buying.

---

## Project structure

```text
src/
├── app/
│   ├── api/auth/login/route.ts
│   ├── api/auth/logout/route.ts
│   ├── api/ideas/round/route.ts
│   ├── globals.css
│   ├── icon.svg
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AccessGate.tsx   IdeaCard.tsx     IntakeForm.tsx
│   ├── Chip.tsx         IdeaGrid.tsx     PrivacyNotice.tsx
│   ├── Footer.tsx       ResetDialog.tsx  Shortlist.tsx
│   ├── Header.tsx       Toast.tsx        Workspace.tsx
│   └── Brand.tsx
└── lib/
    ├── auth.ts          brief.ts         clipboard.ts
    ├── currency.ts      presets.ts       rate-limit.ts
    ├── session.ts       summary.ts       types.ts
    ├── url.ts           validation.ts
    └── llm/
        ├── gemini.ts    openai-compatible.ts  parse.ts
        ├── prompts.ts   provider.ts           stub.ts
        └── types.ts
tests/                    # Vitest unit + route integration tests
design/                   # PRD, HLD, design system, LLD, deployment architecture
```

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| “This email is not on the invite list.” | Add the exact email to `ALLOWED_EMAILS` (comma-separated) and restart/redeploy. |
| “Access is not configured yet.” | Set `ALLOWED_EMAILS` and `INVITE_CODES` (or legacy `INVITE_CODE`) in the server environment. |
| 500 after valid credentials | `SESSION_SECRET` is missing. Set it and restart. |
| 503 from ideas | `GEMINI_API_KEY` missing for `LLM_PROVIDER=gemini`. Add the key or use `LLM_PROVIDER=stub`. |
| 429 from ideas | Wait for the rate-limit window or raise `IDEAS_RATE_LIMIT`. |
| Session expired | Sign in again; cookies last 7 days. |
| Share does nothing | Some browsers lack Web Share. The app copies the summary to the clipboard instead. |
| Fonts look different | Google Fonts may be blocked; the app falls back to system sans-serif. |

---

## Design & architecture docs

- [`design/product_requirements_document_prd.md`](design/product_requirements_document_prd.md)
- [`design/HLD.md`](design/HLD.md)
- [`design/DESIGN.md`](design/DESIGN.md)
- [`design/LLD.md`](design/LLD.md) — low-level design (implementation-aligned)
- [`design/DEPLOYMENT.md`](design/DEPLOYMENT.md) — deployment architecture and go-live checklist
