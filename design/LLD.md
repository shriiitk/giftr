# Low-Level Design (LLD) — `giftr` (Gift Idea Finder)

- **Version:** 1.2
- **Status:** Approved (per-friend invite-code list applied)
- **Related docs:** `product_requirements_document_prd.md`, `HLD.md`, `DESIGN.md`
- **Target stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 3, `lucide-react`, Vitest

> **Implementation note:** this document reflects the code that was built. The owner
> approved the LLD and requested one change: invite codes are now a comma-separated list
> (`INVITE_CODES`) so each friend can have a distinct code that can be revoked individually.
> The legacy single `INVITE_CODE` remains supported for backward compatibility.

---

## 1. Scope & Goals

`giftr` turns a privacy-safe recipient brief and budget range into **5 gift ideas**, lets a signed-in friend accept/reject cards and refill only rejected slots, then locks **2–3 finalists** into a shortlist with a "Why it fits" note that can be copied or shared.

### In scope

- Allowlisted email + shared invite-code access gate with a **7-day signed cookie**.
- Ephemeral client-side workspace state (no database, no server-side note storage).
- Server-side LLM adapter (Gemini primary, OpenAI-compatible + deterministic stub alternatives).
- 5-slot board with accept/reject/reason tags and rejected-slot replacement.
- 2–3 finalist shortlist with copy/share.
- Responsive, accessible UI derived from `DESIGN.md` ("Warm Editorial Utility").
- Unit + route-handler integration tests, lint, production build.

### Out of scope

- Purchasing, checkout, price scraping, backend URL validation/fetching.
- User accounts, persistent profiles, databases, analytics with PII.
- Email delivery / magic links.

---

## 2. Architecture Overview

```text
Browser (React client components)
  ├─ AccessGate ── POST /api/auth/login ──► signed HttpOnly cookie
  └─ Workspace
       ├─ IntakeForm (brief, presets, chips, exclusions)
       ├─ IdeaGrid (5 slots, accept/reject/replace)
       └─ Shortlist (2–3 finalists, note, copy/share)
                │
                └─ POST /api/ideas/round
                        │ verify cookie + rate limit + validate body
                        ▼
                 LlmProvider adapter
                        ├─ GeminiProvider (default)
                        ├─ OpenAiCompatibleProvider (optional)
                        └─ StubProvider (local/test)
```

**Statelessness:** the browser owns the brief, cards, statuses, and note. Route handlers are stateless apart from an in-memory rate-limit map. A page refresh restarts the workspace (acceptable per PRD; sessionStorage is intentionally not used so no gift data lingers on shared devices).

**Rendering model:**

- `src/app/page.tsx` is a server component. It reads the session cookie and renders either `<AccessGate />` or `<Workspace initialEmail={...} />`.
- `Workspace` and all interactive children are `"use client"` components.
- API route handlers are Node.js runtime by default (Web Crypto is used, so they are also Edge-compatible).

---

## 3. Directory Structure

```text
.
├── design/
│   ├── LLD.md
│   ├── DEPLOYMENT.md
│   └── ...existing design files
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/login/route.ts
│   │   │   ├── auth/logout/route.ts
│   │   │   └── ideas/round/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── AccessGate.tsx
│   │   ├── Brand.tsx
│   │   ├── Chip.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── IdeaCard.tsx
│   │   ├── IdeaGrid.tsx
│   │   ├── IntakeForm.tsx
│   │   ├── PrivacyNotice.tsx
│   │   ├── ResetDialog.tsx
│   │   ├── Shortlist.tsx
│   │   ├── Toast.tsx
│   │   └── Workspace.tsx
│   └── lib/
│       ├── auth.ts          # HMAC tokens + credential validation (pure)
│       ├── brief.ts         # form defaults, normalization, client validation
│       ├── clipboard.ts     # copy/share with fallbacks
│       ├── currency.ts      # symbols, Intl formatting
│       ├── llm/
│       │   ├── gemini.ts
│       │   ├── openai-compatible.ts
│       │   ├── parse.ts     # defensive JSON/idea normalization
│       │   ├── prompts.ts
│       │   ├── provider.ts
│       │   ├── stub.ts
│       │   └── types.ts
│       ├── presets.ts
│       ├── rate-limit.ts
│       ├── session.ts       # request cookie helpers + cookie options
│       ├── summary.ts
│       ├── types.ts
│       ├── url.ts           # safe hrefs + Google search URL
│       └── validation.ts
├── tests/
│   ├── auth.test.ts
│   ├── brief.test.ts
│   ├── ideas-route.test.ts
│   ├── login-route.test.ts
│   ├── rate-limit.test.ts
│   ├── stub.test.ts
│   ├── summary.test.ts
│   └── validation.test.ts
├── public/robots.txt
├── .env.example
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── Dockerfile
└── README.md
```

---

## 4. Domain Model (`src/lib/types.ts`)

```ts
export const SLOT_COUNT = 5;
export const MIN_FINALISTS = 2;
export const MAX_FINALISTS = 3;

export type IdeaStatus = "reviewing" | "accepted" | "rejected";

export interface BriefFormState {
  nickname: string;
  occasion: string;
  currency: string;        // ISO code or custom label, e.g. "INR"
  currencyCustom: string;  // used when currency === "CUSTOM"
  budgetMin: string;       // controlled input value
  budgetMax: string;
  likes: string;
  age: string;
  gender: string;
  location: string;
  job: string;
  owns: string[];          // selected "Already Owns" values + custom
  avoid: string[];         // selected "Do Not Want" values + custom
}

export interface ActiveBrief {
  nickname: string;
  occasion: string;
  currency: string;
  budgetMin: number;
  budgetMax: number;
  likes: string;
  age?: string;
  gender?: string;
  location?: string;
  job?: string;
  owns: string[];
  avoid: string[];
}

export interface GiftIdea {
  id: string;
  slot: number;            // 1..5
  title: string;
  description: string;
  estimatedPrice: number | null;
  currency: string;
  whyItFits: string;
  exactUrl: string | null;
  searchUrl: string;       // always generated client/server-side
  status: IdeaStatus;
  rejectionReason: string | null;
}
```

`BriefFormState` is the controlled form. `ActiveBrief` is the normalized snapshot submitted to the API and used for display/summary, so later edits to the form do not silently mutate the active board.

---

## 5. Authentication Design (`src/lib/auth.ts`)

### 5.1 Environment

| Variable | Purpose |
| --- | --- |
| `ALLOWED_EMAILS` | Comma-separated allowlist, compared case-insensitively |
| `INVITE_CODES` | Comma-separated list of per-friend codes, compared case-sensitively; remove one to revoke only that code |
| `INVITE_CODE` | Legacy single code; still supported, ignored when `INVITE_CODES` is set |
| `SESSION_SECRET` | HMAC-SHA-256 signing key (32+ random chars recommended) |

### 5.2 Cookie

- Name: `giftr_session`
- Value: `<base64url(payload)>.<base64url(HMAC-SHA-256(payload))>`
- Payload: `{ "email": "friend@example.com", "exp": 1735689600 }` (Unix seconds)
- Attributes: `HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` plus `Secure` when `NODE_ENV === "production"`.
- TTL: exactly 7 days (`604800` seconds).

### 5.3 Functions

```ts
isAllowedEmail(email: string, allowlist = process.env.ALLOWED_EMAILS): boolean
parseInviteCodes(raw: string | undefined): string[]          // trims, dedupes, case-sensitive
isInviteCodeValid(code: string, rawCodes?: string): boolean  // matches any active code
validateCredentials(email, inviteCode, env): { ok: true; email: string } | { ok: false; reason: string }
createSessionToken(email: string, now = Date.now()): Promise<string>
verifySessionToken(token: string, now = Date.now()): Promise<{ email: string } | null>
SESSION_COOKIE, SESSION_MAX_AGE
```

`src/lib/session.ts` contains the Next-specific glue:

```ts
getSessionFromRequest(req: NextRequest): Promise<{ email: string } | null>
sessionCookieOptions(): { name, httpOnly, sameSite, path, maxAge, secure }
```

The RSC page reads `cookies()` directly and calls `verifySessionToken`, keeping the pure
auth module free of `next/headers` so it can be unit-tested without a request context.

Verification uses constant-time comparison of signatures, rejects malformed tokens, expired tokens, and payloads without a string email. Invalid tokens never throw; they return `null`.

Invite-code verification trims the submitted code, parses the configured list, and compares
against **every** active code with a constant-time comparison (no short-circuit). This means
each friend can hold a distinct code; removing one entry revokes only that entry. The email
allowlist remains a separate gate, so an allowlisted email plus any active code is required.

### 5.4 Routes

**`POST /api/auth/login`**

```json
{ "email": "friend@example.com", "inviteCode": "WARM-GIFT-2026" }
```

- `200 { "ok": true, "email": "friend@example.com" }` + `Set-Cookie: giftr_session=...`
- `400 { "error": "Enter a valid email address." }`
- `401 { "error": "This email is not on the invite list." }` / `"That invite code is not correct."`
- `500 { "error": "Server auth is not configured." }` if `SESSION_SECRET` is missing.
- Always `Cache-Control: no-store`.

**`POST /api/auth/logout`**

- `200 { "ok": true }` + expired cookie (`Max-Age=0`).

The access gate posts credentials, then calls `router.refresh()` so the server component re-reads the new cookie and swaps to `Workspace`.

### 5.5 API session guard

Every ideas request calls `getSessionFromRequest(req)`; missing/invalid → `401 { error: "Your session has expired. Please sign in again." }`.

---

## 6. Ideas API (`POST /api/ideas/round`)

### 6.1 Request

```json
{
  "nickname": "The Coffee Purist",
  "occasion": "Birthday",
  "currency": "INR",
  "budgetMin": 2000,
  "budgetMax": 5000,
  "likes": "pour-over coffee, tactile stationery",
  "age": "late 20s",
  "gender": "",
  "location": "Bengaluru",
  "job": "product designer",
  "owns": ["French press"],
  "avoid": ["Gift cards"],
  "slots": [2, 4],
  "acceptedTitles": ["Brass desk tray"],
  "rejectedTitles": ["Scented candle"]
}
```

- `slots` is optional; omitted/empty means `[1,2,3,4,5]`.
- `slots` must be unique integers in `1..5`.
- `acceptedTitles` / `rejectedTitles` are hints used to avoid duplicates during refill.

### 6.2 Response

```json
{
  "ideas": [
    {
      "slot": 2,
      "title": "Stoneware Pour-Over Set",
      "description": "Hand-glazed dripper and carafe for a slower morning ritual.",
      "estimatedPrice": 3200,
      "currency": "INR",
      "whyItFits": "Matches the pour-over ritual and avoids the French press they already own.",
      "exactUrl": "https://example.com/product",
      "searchUrl": "https://www.google.com/search?q=Stoneware%20Pour-Over%20Set%20INR"
    }
  ],
  "provider": "gemini",
  "generatedAt": "2026-11-21T10:00:00.000Z"
}
```

- `exactUrl` is passed through **without server-side validation or fetching** (per PRD). The client only renders it as a link when it parses as `http:`/`https:`; otherwise it displays "No exact link returned".
- `searchUrl` is always generated from the title + currency, so every card has a safe fallback.
- Errors: `400` validation, `401` unauthenticated, `429` rate limited (`Retry-After` header), `502` provider failure, `503` provider not configured, `500` unexpected.

### 6.3 Validation rules (`src/lib/validation.ts`)

| Field | Rule |
| --- | --- |
| `nickname` | trimmed, 1–80 chars |
| `occasion` | trimmed, 1–80 chars |
| `likes` | trimmed, 1–1200 chars |
| `currency` | trimmed, 1–12 chars, normalized uppercase |
| `budgetMin` / `budgetMax` | finite numbers, ≥ 0, max ≥ min, max ≤ 10,000,000 |
| optional context | each ≤ 120 chars |
| `owns` / `avoid` | arrays ≤ 20 items, each 1–80 chars, de-duplicated case-insensitively |
| `slots` | ≤ 5 unique integers 1–5 |
| body | JSON object, ≤ 64 KB (checked via `Content-Length` when present and parse errors) |

The validator returns `{ ok: true, value }` or `{ ok: false, error }`; it never throws on bad input.

---

## 7. LLM Provider Layer

### 7.1 Interface (`src/lib/llm/types.ts`)

```ts
export interface IdeaGenerationInput {
  brief: ActiveBrief;
  count: number;             // 1..5
  slots: number[];           // requested slot numbers
  excludeTitles: string[];   // accepted + rejected + already-seen titles
  seed?: string;
}

export interface GeneratedIdea {
  title: string;
  description: string;
  estimatedPrice: number | null;
  currency: string;
  whyItFits: string;
  exactUrl: string | null;
}

export interface LlmProvider {
  readonly name: string;
  generateIdeas(input: IdeaGenerationInput): Promise<GeneratedIdea[]>;
}
```

### 7.2 Selection (`src/lib/llm/provider.ts`)

- `LLM_PROVIDER=gemini` (default) → `GeminiProvider` (`GEMINI_API_KEY`, `GEMINI_MODEL` default `gemini-2.5-flash`).
- `LLM_PROVIDER=openai` → `OpenAiCompatibleProvider` (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`).
- `LLM_PROVIDER=stub` → deterministic `StubProvider` for local demos and tests.
- Unknown value → configuration error (`503`).
- Missing API key → configuration error (`503`), never a silent fallback in production.

### 7.3 Gemini call

`POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
with the key sent in the `x-goog-api-key` header (never in the URL or client bundle).

```json
{
  "systemInstruction": { "parts": [{ "text": "..." }] },
  "contents": [{ "role": "user", "parts": [{ "text": "<brief prompt>" }] }],
  "generationConfig": {
    "temperature": 0.9,
    "responseMimeType": "application/json",
    "responseSchema": { "...": "ideas array schema" }
  }
}
```

A 25-second `AbortSignal.timeout` guards the request. Non-2xx responses are mapped to a sanitized `LlmError` (no API key leakage). JSON is parsed defensively: markdown fences stripped, then `ideas` array validated; invalid entries are dropped; fewer than requested ideas raises `LlmError`.

### 7.4 Prompt contract (`src/lib/llm/prompts.ts`)

System prompt establishes: thoughtful gift curator; privacy-safe; no PII; respect exclusions; stay within min/max budget and currency; avoid duplicates; return exactly N ideas; never invent certainty about stock/price; `exactUrl` only when a genuine product page is known, otherwise `null`; keep copy concise; output JSON only.

User prompt includes the recipient brief, optional context, owns/avoid lists, budget/currency, requested count, and exclusion titles. Prices are requested as numbers in the chosen currency. The server assigns slot numbers and generates search URLs; the model does not control slots.

### 7.5 Stub provider

Deterministic, budget-aware pool of ~10 ideas with title/description/why/exact URL placeholders (`https://example.com/...`). It rotates by seed and filters titles in `excludeTitles`, so local UI flows and tests are fully exercisable without an API key. It intentionally returns plausible prices scaled into the budget range.

---

## 8. Rate Limiting (`src/lib/rate-limit.ts`)

- In-memory sliding window keyed by session email.
- Defaults: 8 idea requests / 600 seconds; overridable via `IDEAS_RATE_LIMIT` and `IDEAS_RATE_WINDOW_SECONDS`.
- `consume(key, now)` returns `{ allowed, remaining, retryAfterSeconds }`.
- A `Map<string, number[]>` stores timestamps; entries are pruned on access. Tests inject `now` and use a reset helper.
- Known limitation: serverless instances do not share memory; this is a guardrail, not a hard quota. Documented in `DEPLOYMENT.md`; optional future upgrade is Upstash Redis / Vercel KV.

The route sets `Retry-After` and returns `429 { error, retryAfterSeconds }`.

---

## 9. Client State & Component Design

### 9.1 Workspace state machine

```text
view: "intake" | "grid" | "shortlist"

intake --submit (valid)--> loading --> grid (5 reviewing cards)
grid --accept (<=3)--> grid (accepted pinned)
grid --reject + optional reason--> grid (rejected)
grid --replace rejected--> loadingReplacement --> grid (accepted kept, rejected slots refreshed)
grid --view shortlist (accepted >=2)--> shortlist
shortlist --back--> grid
any --new person/reset--> intake (optional keep currency+location)
any --session 401--> expired banner / reload to sign in
```

`Workspace` owns: `brief`, `activeBrief`, `ideas`, `note`, `view`, `loading`, `replacingSlots`, `error`, `toast`, `resetOpen`.

Derived values: `accepted = ideas.filter(status === "accepted")`, `rejected`, `reviewing`, `acceptedCount`.

### 9.2 Components

| Component | Responsibility |
| --- | --- |
| `Header` | Brand, step nav (Find Ideas / 5-Slot Grid / Shortlist n/3), New Person / Reset, sign out |
| `AccessGate` | Email + invite code form, privacy reminder, inline errors, loading state |
| `IntakeForm` | Presets, core fields, occasion chips + custom, budget/currency + custom currency, likes, optional details (collapsible on mobile, always visible on md+), owns/avoid chip toggles + free-text add, privacy notice, submit |
| `IdeaGrid` | Heading, accepted/rejected/reviewing counts, 5-card responsive grid, empty/loading skeletons, replace-rejected action, sticky bottom bar |
| `IdeaCard` | Slot + status badge, title/price, description, why-it-fits, exact/search links, verification warning, accept/reject, rejection reason chips |
| `Shortlist` | 2–3 accepted rows, total, editable note, plaintext preview, copy/share, back-to-board, mobile sticky action bar |
| `ResetDialog` | Modal with "Keep currency & location defaults" checkbox, confirm/cancel, Escape/backdrop close |
| `Toast` | Fixed, auto-dismissing status message (`role="status"`) |
| `PrivacyNotice` | Reusable lock/shield warning with required copy |
| `Chip` | Accessible toggle button (`aria-pressed`) |

### 9.3 Validation & feedback

- Client-side submit validation: nickname, occasion, likes, budget numbers, max ≥ min, currency non-empty. Inline field errors; focus moves to first invalid field.
- Accept is capped at 3; the 4th attempt shows a toast: "You can lock up to 3 finalists. Reject one first."
- Shortlist CTA disabled until at least 2 accepted, with helper text "Accept 2–3 ideas to build your shortlist."
- All network failures render a retryable error banner; 429 shows a human-readable wait message.
- Buttons disable while loading and show spinners; replacement only affects rejected slots.

### 9.4 Reset behavior

`ResetDialog` clears brief fields, active brief, ideas, note, shortlist, and returns to intake. When "Keep currency & location" is checked, the current currency/custom currency and location survive. Sign out is separate (clears cookie only).

### 9.5 Copy / share (`src/lib/summary.ts`, `src/lib/clipboard.ts`)

`buildShortlistSummary({ brief, ideas, note })` returns clean plain text:

```text
Gift Shortlist for The Coffee Purist (Birthday)
Budget: INR 2,000–INR 5,000 · Estimated total: INR 6,400

1. Stoneware Pour-Over Set — INR 3,200
   Hand-glazed dripper and carafe for a slower morning ritual.
   Why it fits: Matches the pour-over ritual...
   Exact link: https://...
   Search: https://www.google.com/search?q=...

Why it fits: Thoughtful picks for slow mornings.

Please verify links & live prices yourself before buying.
```

- `copyText` uses `navigator.clipboard.writeText`, falling back to a hidden textarea + `document.execCommand("copy")`.
- Share uses `navigator.share({ title, text })` when available; on unsupported browsers or share errors it copies instead and shows "Copied instead".
- UI never claims a link is verified.

---

## 10. Responsive & Visual Design Mapping

Design tokens in `tailwind.config.ts` mirror `DESIGN.md`: canvas `#FAF7F2`, surface `#FFFFFF`, primary `#A9310F` / `#D9532F`, secondary `#1B4D3E`, border `#E8E2D9`, text `#1E293B`, muted `#64748B`, status colors.

| Breakpoint | Behavior |
| --- | --- |
| `< 768px` | Single column, 1rem margins, horizontally scrollable step nav, collapsible optional details, 2-column accept/reject controls, sticky bottom action bars on grid and shortlist |
| `768–1023px` | 2-column card grid, optional details visible, two-column form groupings |
| `≥ 1024px` | Max-width 1200px, 3-column card grid, intake split 7/5, shortlist split 7/5, optional details always visible |

Typography: Epilogue for display/headlines, Plus Jakarta Sans for body/labels, loaded via Google Fonts `<link>` with system fallbacks. Buttons are pills; cards use 1rem radius, 1px border, and the diffused warm shadows from the design system. Focus rings use a 2px primary outline with offset.

Accessibility: semantic headings, labeled inputs, `aria-pressed` chips, `aria-live` for toasts/errors, dialog semantics, keyboard-operable cards, `rel="noopener noreferrer"` + `target="_blank"` on external links, visible focus states, minimum 44px touch targets on primary mobile actions.

---

## 11. Security & Privacy

- Secrets only in server env; only `NEXT_PUBLIC_*` values would reach the client (none are used).
- Signed `HttpOnly` cookie; `Secure` in production; `SameSite=Lax`.
- Each active invite code compared server-side with constant-time comparison; allowlist
  case-insensitive. Per-friend codes can be added/removed independently.
- Rate limit keyed by verified session email.
- Request body size/shape validation; no HTML injection paths (React escapes output).
- External URLs are not fetched server-side. Client-side href sanitization allows only `http:`/`https:`.
- No PII persistence: state lives in React memory; privacy copy appears on gate and intake; no analytics.
- Security headers in `next.config.ts`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` minimal.
- Error responses are sanitized; provider errors are logged server-side without secrets.

---

## 12. Testing Strategy

**Unit (Vitest, Node environment):**

- `auth.test.ts`: allowlist normalization, invite validation, sign/verify round-trip, tampering, expiry, malformed tokens, cookie constants.
- `brief.test.ts`: empty-form errors, normalization, max < min, custom currency.
- `rate-limit.test.ts`: allow/deny thresholds, per-key isolation, window expiry, retry-after, env parsing.
- `validation.test.ts`: happy path, bad budgets, slot rules, trimming/deduping, oversized arrays, body size.
- `summary.test.ts`: titles, prices, links, note, verification reminder; custom currency.
- `stub.test.ts`: count, exclusions, budget scaling, determinism.

**Integration (route handlers):**

- `login-route.test.ts`: sets cookie on valid credentials; rejects bad email/code; rejects malformed body; 500 on missing secret.
- `ideas-route.test.ts`: 401 without cookie; 400 invalid payload; 200 with stub provider and requested slots; 413 oversized body; 429 after limit; 503 when provider misconfigured.

**Result:** 8 files / 67 tests passing. **Static gates:** `npm run lint` (ESLint 9 + Next config), `npm run typecheck` (`tsc --noEmit`), `npm run build` (Next 16 production build) all pass. Test/fix loop was run to green within the 5-iteration cap.

---

## 13. Environment Variables

See `.env.example`:

```bash
ALLOWED_EMAILS=you@example.com,friend@example.com
INVITE_CODES=ALEX-2026,SAM-2026,PRIYA-2026
# Legacy single code (optional; INVITE_CODES wins when both are set):
# INVITE_CODE=WARM-GIFT-2026
SESSION_SECRET=replace-with-a-long-random-string

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
LLM_PROVIDER=gemini

# Optional alternative provider
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

IDEAS_RATE_LIMIT=8
IDEAS_RATE_WINDOW_SECONDS=600
```

---

## 14. Assumptions & Open Questions for Review

1. **No persistence:** refreshing loses the board. Acceptable per PRD's ephemeral requirement. If you want refresh resilience, add `sessionStorage` hydration (small change, still device-local).
1a. **Invite-code list (approved):** `INVITE_CODES` is comma-separated and case-sensitive; each friend can receive a distinct code. Removing a code revokes future logins using that code without affecting other codes. Existing 7-day sessions are unaffected until expiry or `SESSION_SECRET` rotation. `INVITE_CODE` remains as a legacy single-code fallback.
2. **Accept = lock:** accepting a card is the locking action; max 3 accepted. A separate explicit "Lock" step could be added if desired.
3. **Rate limit storage:** in-memory is best-effort on serverless. Confirm this is acceptable for the friend-only scale, or budget for Upstash/Vercel KV.
4. **Custom currency:** supports free-text codes/labels; formatting falls back to `CODE 1,234` when `Intl` does not recognize it.
5. **Exact links:** model-provided only; no server validation or scraping, per PRD. UI always shows the search fallback and verification warning.
6. **Gemini model default:** `gemini-2.5-flash`; confirm your available model/quota, or set `GEMINI_MODEL` to another free-tier model.
7. **Refill batch size:** one API call fills all rejected slots (up to 5). Confirm this is preferable to per-slot calls (fewer quota units, slightly less variety control).

Please review this LLD (especially items in §14) and reply with any changes. I will iterate the document until it is approved, then treat it as the implementation contract.
