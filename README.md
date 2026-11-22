# giftr — Gift Idea Finder

A private, ephemeral gift-shortlist workspace for a small circle of friends.

Describe a recipient with a privacy-safe nickname, an occasion, a budget range, and a few interests. `giftr` generates **5 gift ideas**, lets you accept/reject cards and replace rejected slots, then narrows to **2–3 finalists** with a copyable/shareable summary. There is **no database** and **no long-term storage** — the brief and shortlist live in the browser session only.

---

## Table of contents

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [Invite codes and access management](#invite-codes-and-access-management)
- [Development](#development)
- [Testing](#testing)
- [Manual QA checklist](#manual-qa-checklist)
- [Build](#build)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security and privacy](#security-and-privacy)
- [Project structure](#project-structure)
- [Design docs](#design-docs)

---

## What it does

- **Friend access gate** — allowlisted email + a personal invite code. No passwords, no accounts.
- **Recipient intake** — nickname/persona, occasion, currency, min/max budget, likes, and optional age/gender/location/job. Includes “already owns” and “do not want” chips plus free text.
- **5-slot idea board** — one generation returns 5 ideas within budget, each with a title, description, estimated price, “why it fits” rationale, an exact link when available, and a safe search link.
- **Accept / reject / replace** — accept up to 3 finalists; reject cards with an optional reason; “Replace rejected” refills only the rejected slots and keeps accepted cards in place.
- **Shortlist (2–3)** — requires at least 2 accepted ideas. Add a personal “why it fits” note, then copy the summary or use the native share sheet.
- **Ephemeral by design** — refresh clears client state; nothing is written to `localStorage` or a database.
- **Quota protection** — allowlist + invite codes + signed session cookie + per-session rate limiting protect the free-tier LLM quota.

### Access model

1. `GET /` checks the `giftr_session` cookie.
2. No valid cookie → **Access Gate** (email + invite code).
3. Valid cookie → **Workspace**.
4. Sessions last 7 days. Rotating `SESSION_SECRET` signs everyone out immediately. Logging out clears the cookie.

---

## How it works

```text
Browser
  │
  ├─ GET / ──────────────► Next.js RSC page
  │                         └─ valid giftr_session cookie?
  │                              ├─ no  → AccessGate
  │                              └─ yes → Workspace
  │
  ├─ POST /api/auth/login ─► validate ALLOWED_EMAILS + INVITE_CODES
  │                         └─ set HttpOnly, SameSite=Lax, 7-day cookie
  │
  ├─ POST /api/ideas/round ► verify cookie → rate limit → validate body
  │                         └─ LLM provider (Gemini / OpenAI-compatible / stub)
  │
  └─ POST /api/auth/logout ► clear cookie
```

- **No database.** The brief, cards, finalists, and note are React state in the browser.
- **No server-side brief storage.** API routes return `Cache-Control: no-store`.
- **LLM keys never reach the browser.** All provider calls happen server-side.
- **Rate limits are in-memory per server instance.** Default: 8 idea generations per 10 minutes per session email. Restarting `next dev` resets them.

### API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/auth/login` | `POST` | Validate email + invite code, issue session cookie |
| `/api/auth/logout` | `POST` | Clear session cookie |
| `/api/ideas/round` | `POST` | Generate ideas for requested slots (1–5) |

`/api/ideas/round` requires a valid session and accepts a JSON brief. Request bodies are capped at **64 KB**. Slot numbers must be unique integers from 1 to 5.

---

## Tech stack

- **Next.js 16** (App Router, Route Handlers, RSC)
- **React 19**
- **TypeScript 5.9**
- **Tailwind CSS 3**
- **Vitest 3** for unit/integration tests
- **ESLint 9** (`eslint-config-next`)
- **Node.js 20.9+** required by Next 16; **Node 22** is recommended and used by the Docker image
- No database, no auth service, no analytics

---

## Quick start (local)

### 1. Prerequisites

- Node.js **20.9+** (Node 22 recommended)
- npm (bundled with Node)
- Optional: Docker, if you want to test the production image
- Optional: a Gemini API key. **You do not need one for local development** — the built-in `stub` provider returns demo ideas from a fixed local pool with no network calls.

Check your version:

```bash
node --version
npm --version
```

### 2. Install dependencies

```bash
npm ci
```

(`npm install` also works, but `npm ci` matches the lockfile and is what CI/deployment uses.)

### 3. Create your local environment file

```bash
cp .env.example .env.local
```

Then edit `.env.local`. For a zero-key local demo, use:

```dotenv
ALLOWED_EMAILS=you@example.com
INVITE_CODES=GIFTCODE2026
SESSION_SECRET=replace-with-a-long-random-string
LLM_PROVIDER=stub
```

Generate a real session secret instead of the placeholder:

```bash
openssl rand -base64 48
```

Paste the output as `SESSION_SECRET`.

> `.env.local` is gitignored. Never commit real secrets.

### 4. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

Sign in with the email from `ALLOWED_EMAILS` and the code from `INVITE_CODES` (for the example above: `you@example.com` / `WARM-GIFT-2026`).

> **Important:** Next.js reads `.env.local` when the server starts. **Restart `npm run dev` after changing any environment variable.**

### 5. Use the app

1. Enter the recipient nickname, occasion, budget, and interests.
2. Generate 5 ideas.
3. Accept 2–3 cards, reject others (optionally pick a reason), and use **Replace rejected** to refill only rejected slots.
4. Open the shortlist, add a note, then copy or share the summary.

---

## Environment variables

All variables are **server-side only**. Never prefix them with `NEXT_PUBLIC_`.

| Variable                    | Required    | Default                     | Notes                                                          |
| --------------------------- | ----------- | --------------------------- | -------------------------------------------------------------- |
| `ALLOWED_EMAILS`            | **Yes**     | —                           | Comma-separated allowlist; comparison is case-insensitive      |
| `INVITE_CODES`              | **Yes\***   | —                           | Comma-separated per-friend codes; comparison is case-sensitive |
| `INVITE_CODE`               | No          | —                           | Legacy single code; ignored when `INVITE_CODES` is set         |
| `SESSION_SECRET`            | **Yes**     | —                           | Long random string used to sign the 7-day session cookie       |
| `LLM_PROVIDER`              | No          | `gemini`                    | `gemini`, `openai` (or `openai-compatible`), or `stub`         |
| `GEMINI_API_KEY`            | If `gemini` | —                           | Server-only Google AI Studio key                               |
| `GEMINI_MODEL`              | No          | `gemini-3.5-flash-lite`     | Model ID, with or without a `models/` prefix                   |
| `OPENAI_API_KEY`            | If `openai` | —                           | Server-only key                                                |
| `OPENAI_BASE_URL`           | No          | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint                                 |
| `OPENAI_MODEL`              | No          | `gpt-4o-mini`               | Model ID                                                       |
| `IDEAS_RATE_LIMIT`          | No          | `8`                         | Idea generations allowed per session inside the window         |
| `IDEAS_RATE_WINDOW_SECONDS` | No          | `600`                       | Rate-limit window (10 minutes)                                 |

\* Required unless the legacy `INVITE_CODE` is set.

### Provider options

| `LLM_PROVIDER` | Needs a key? | Behavior |
| --- | --- | --- |
| `stub` | No | Fixed-pool local demo ideas; no network calls; ideal for development and CI |
| `gemini` | `GEMINI_API_KEY` | Calls the Gemini API with structured JSON output; 25s timeout |
| `openai` / `openai-compatible` | `OPENAI_API_KEY` | Calls an OpenAI-compatible chat completions endpoint |

Example local config using Gemini:

```dotenv
ALLOWED_EMAILS=you@example.com,friend@example.com
INVITE_CODES=CODE-FOR-YOU,CODE-FOR-FRIEND
SESSION_SECRET=<paste openssl rand -base64 48 output>
LLM_PROVIDER=gemini
GEMINI_API_KEY=<your key>
GEMINI_MODEL=gemini-3.5-flash-lite
```


## Invite codes and access management

Access requires **both** an allowlisted email and a valid invite code. Codes are configured with environment variables — there is no admin UI and no database.

### Format

```dotenv
ALLOWED_EMAILS=you@example.com,friend@example.com
INVITE_CODES=CODE-FOR-YOU,CODE-FOR-FRIEND
```

- `ALLOWED_EMAILS`: comma-separated, trimmed, **case-insensitive**.
- `INVITE_CODES`: comma-separated, trimmed, **case-sensitive**; duplicates are ignored.
- `INVITE_CODES` takes precedence over the legacy `INVITE_CODE` when both are set.
- A friend can use **any** active code, not necessarily “their” code. One code per friend is a convention for easy revocation, not a per-email binding.

### Add a friend

1. Generate a code, for example:
   ```bash
   openssl rand -hex 4        # e.g. 7f3a9c21
   # or make a friendly one: WARM-GIFT-SAM
   ```
2. Add their email to `ALLOWED_EMAILS`.
3. Append the code to `INVITE_CODES`.
4. Restart the app (local) or redeploy/restart the host (production).
5. Send them the URL, their email, and the code through a private channel.

### Revoke one friend

- Remove **their code** from `INVITE_CODES`. Other codes keep working.
- Remove their email from `ALLOWED_EMAILS` if you also want to block that address.
- Existing sessions remain valid until they expire (7 days) or `SESSION_SECRET` is rotated. To cut off access immediately, rotate `SESSION_SECRET` — this signs **everyone** out.

### Revoke everyone

- Rotate `SESSION_SECRET` (invalidates all existing cookies), and/or
- Clear or replace `INVITE_CODES`, then restart/redeploy.

### Production notes

- Treat invite codes like passwords; they are stored in plaintext in the environment.
- On Vercel, environment-variable changes apply to **new deployments**. Redeploy after changing access config.
- Keep a copy of active codes and the session secret in a password manager.

---

## Development

### Scripts

| Command              | What it does                                            |
| -------------------- | ------------------------------------------------------- |
| `npm run dev`        | Start the Next.js dev server at `http://localhost:3000` |
| `npm run build`      | Production build                                        |
| `npm start`          | Serve the production build (run `npm run build` first)  |
| `npm run lint`       | ESLint                                                  |
| `npm run typecheck`  | `tsc --noEmit`                                          |
| `npm test`           | Run the Vitest suite once                               |
| `npm run test:watch` | Vitest in watch mode                                    |
| `npm run verify`     | Lint + typecheck + tests + build (pre-push gate)        |

### Typical loop

```bash
npm run dev
# edit code; the dev server hot-reloads
npm run test:watch   # in a second terminal
npm run verify       # before pushing
```

### Switching providers locally

- Fastest and key-free: `LLM_PROVIDER=stub`.
- To test real generation: set `LLM_PROVIDER=gemini` and `GEMINI_API_KEY`, then restart.
- To test an OpenAI-compatible endpoint: set `LLM_PROVIDER=openai`, `OPENAI_API_KEY`, and optionally `OPENAI_BASE_URL` / `OPENAI_MODEL`.

The stub provider never calls the network. It picks from a fixed pool using a seed built from the session, timestamp, and requested slots, and it respects budget and exclusions, so repeated rounds may rotate through similar demo ideas. Use Gemini for real variety.

### Code conventions

- Server-only logic lives in `src/lib/*` and route handlers under `src/app/api/*`.
- `src/lib/auth.ts` — allowlist, invite codes, HMAC session tokens.
- `src/lib/session.ts` — read the session from a request and cookie options.
- `src/lib/llm/provider.ts` — provider selection and config errors.
- `src/lib/validation.ts` — request shape/size validation.
- `src/lib/rate-limit.ts` — in-memory sliding-window limiter.
- `src/lib/brief.ts`, `summary.ts`, `currency.ts` — brief validation, summary formatting, currency handling.
- Client components live in `src/components/*` and are marked `"use client"`.
- Path alias: `@/*` → `src/*` (configured in `tsconfig.json` and `vitest.config.ts`).
- Keep secrets server-side; never use `NEXT_PUBLIC_` for keys or access config.

---

## Testing

### Run the suite

The suite currently contains **67 tests across 8 files**, runs quickly, and needs no network or API key.

```bash
npm test
```

or in watch mode:

```bash
npm run test:watch
```

Run a single file:

```bash
npx vitest run tests/auth.test.ts
```

### What is covered

| Test file | Focus |
| --- | --- |
| `tests/auth.test.ts` | Allowlist parsing, invite-code validation, credential errors, session token sign/verify/expiry |
| `tests/login-route.test.ts` | `POST /api/auth/login` success, bad credentials, missing config, cookie behavior |
| `tests/ideas-route.test.ts` | Auth required, slot generation, defaults, invalid payloads, malformed JSON, rate limiting, provider misconfiguration, body-size cap |
| `tests/validation.test.ts` | Request validation and 64 KB body guard |
| `tests/rate-limit.test.ts` | Window/limit behavior and retry-after |
| `tests/brief.test.ts` | Intake form validation |
| `tests/stub.test.ts` | Deterministic stub generation, exclusions, budget bounds |
| `tests/summary.test.ts` | Shortlist summary text and currency formatting |

Tests run in a Node environment and use the `stub` provider, so they need **no API key and no network**.

### Coverage reporting

Vitest is configured, but a coverage provider is not installed by default. To generate a report:

```bash
npm i -D @vitest/coverage-v8
npx vitest run --coverage
```

The HTML report is written to `coverage/` (gitignored). There are currently **no browser/E2E tests** — use the manual checklist below for UI flows.

---

## Manual QA checklist

Use `LLM_PROVIDER=stub` for a fast, free, offline pass.

### Access

- [ ] Visiting `/` without a cookie shows the **Access Gate**, not the workspace.
- [ ] An email not in `ALLOWED_EMAILS` is rejected with “This email is not on the invite list.”
- [ ] A wrong invite code is rejected with “That invite code is not correct.”
- [ ] A valid email + code signs in and shows the workspace.
- [ ] Invalid/expired session shows a sign-in prompt rather than a broken page.
- [ ] **Log out** clears the cookie and returns to the gate.

### Intake

- [ ] Submitting an empty form highlights required fields (nickname, occasion, likes, budget).
- [ ] Max budget lower than min budget is rejected.
- [ ] Optional fields can be left blank.
- [ ] “Already owns” / “Do not want” chips toggle and custom entries are kept.
- [ ] Currency selector and custom currency work.
- [ ] Quick-start presets (if shown) populate the form.

### Idea board

- [ ] Generating returns exactly **5** cards with title, description, price, “why it fits”, and links.
- [ ] Prices fall within the min–max budget and use the selected currency.
- [ ] **Accept** toggles a card; a 4th acceptance is blocked with an explanation.
- [ ] **Reject** toggles a card and lets you choose an optional reason.
- [ ] **Replace rejected** refills only rejected slots; accepted cards stay in place.
- [ ] Accepted/rejected counts and the shortlist progress indicator update correctly.
- [ ] External links open in a new tab; the price-verification notice is visible.

### Shortlist

- [ ] Shortlist is locked until at least **2** ideas are accepted.
- [ ] Removing a finalist drops below 2 and sends you back to the board with a message.
- [ ] The “why it fits” note is included in the summary.
- [ ] **Copy summary** places readable text on the clipboard.
- [ ] **Share** uses the native share sheet when available and falls back to copy.
- [ ] **New person / reset** clears the workspace; the “keep currency & location” option works.

### Limits and failures

- [ ] Set `IDEAS_RATE_LIMIT=1`, restart, generate twice → second call returns a friendly 429 message.
- [ ] Stop the network / use an invalid Gemini key → a clear provider error is shown, not a crash.
- [ ] Rotate `SESSION_SECRET`, restart, refresh → you are signed out.
- [ ] Refresh the page → workspace state resets (expected; state is ephemeral).

### Optional API smoke test

With the dev server running and a valid `.env.local`:

```bash
# 1. Log in and store the session cookie
curl -s -c /tmp/giftr-cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","inviteCode":"WARM-GIFT-2026"}'

# 2. Generate ideas using the cookie
curl -s -b /tmp/giftr-cookies.txt \
  -X POST http://localhost:3000/api/ideas/round \
  -H 'Content-Type: application/json' \
  -d '{
    "nickname":"The Coffee Purist",
    "occasion":"Birthday",
    "currency":"INR",
    "budgetMin":1500,
    "budgetMax":4000,
    "likes":"pour-over coffee, tactile stationery",
    "owns":["French press"],
    "avoid":["Gift cards"],
    "slots":[1,2,3,4,5]
  }'
```

A `401` without the cookie and a `200` with it are good health signals. `429` means the rate limit is working.

---

## Build

Create and test the production build locally:

```bash
npm run build
npm start
```

Then open <http://localhost:3000>. `npm start` serves the optimized build and loads `.env.local`; `NODE_ENV` is `production`, so the session cookie is marked `Secure` (browsers treat `localhost` as a secure context).

Pre-push gate:

```bash
npm run verify
```

This runs lint, typecheck, the full test suite, and the production build.

---

## Deployment

### Option A — Vercel (recommended, free tier)

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Framework preset: **Next.js** (auto-detected).
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output: managed by Vercel (`.next`)
   - Node.js: **22.x** (20.9+ works)
4. Add environment variables for **Production** and **Preview**:
   - `ALLOWED_EMAILS`
   - `INVITE_CODES` (or legacy `INVITE_CODE`)
   - `SESSION_SECRET`
   - `LLM_PROVIDER` (`gemini` in production, or `stub` for a demo)
   - `GEMINI_API_KEY` (if using Gemini)
   - Optional: `GEMINI_MODEL`, `OPENAI_*`, `IDEAS_RATE_LIMIT`, `IDEAS_RATE_WINDOW_SECONDS`
5. Deploy.
6. Smoke test: unauthenticated `/` shows the gate; valid login works; generating ideas succeeds.
7. After changing env vars, **redeploy** so the new values take effect.
8. Optional: pick a function region close to your friends to reduce LLM latency.

Preview deployments can burn LLM quota. Either use separate preview codes or protect previews with Vercel Authentication.

### Option B — Docker (any Node host: Render, Fly.io, Railway, VPS)

The repo includes a multi-stage `Dockerfile` (`node:22-alpine`, `npm ci`, `npm run build`, then `npm start` on port 3000).

```bash
docker build -t giftr .
docker run --rm -p 3000:3000 --env-file .env.local giftr
```

Then open <http://localhost:3000>.

Notes:

- The image sets `NODE_ENV=production`, so cookies are `Secure`. Browsers treat `localhost` as secure, but if you access the container via a plain-HTTP LAN IP, the cookie may not stick. Put it behind HTTPS (platform TLS, Caddy, or Nginx) for non-local access.
- Inject secrets through the platform’s secret manager, not by baking them into the image.
- In-memory rate limits are per container. Run a single instance, or add Redis/Upstash for a shared limit.

### Option C — Any Node.js host

```bash
npm ci
npm run build
npm start
```

Set the same environment variables in the host’s dashboard, terminate TLS at the platform/proxy, and keep one instance (or add a shared rate-limit store).

### Production checklist

- [ ] `ALLOWED_EMAILS`, `INVITE_CODES`, `SESSION_SECRET`, and the provider key are set in the production environment.
- [ ] `SESSION_SECRET` is long and random (not the example value).
- [ ] `npm run verify` passes locally.
- [ ] Unauthenticated `/` shows the access gate.
- [ ] Valid login sets a session; invalid code/email is rejected.
- [ ] Generate 5 ideas, accept 2, reject 1, replace the rejected slot; accepted cards stay.
- [ ] Copy and share the shortlist on mobile and desktop.
- [ ] Rate-limit values suit your friend group.
- [ ] Rollback plan is known (Vercel instant rollback or previous image).
- [ ] Active codes and the session secret are stored in a password manager.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| “Access is not configured yet. Ask the owner to set the server environment.” | `ALLOWED_EMAILS` or `INVITE_CODES`/`INVITE_CODE` is missing/blank, or the server wasn’t restarted | Set both in `.env.local`, then restart `npm run dev` |
| “Server auth is not configured. Ask the owner to set SESSION_SECRET.” | `SESSION_SECRET` missing/blank | Generate one with `openssl rand -base64 48`, add it, restart |
| Login returns 503 / “GEMINI_API_KEY is not configured” | `LLM_PROVIDER=gemini` but no key | Add `GEMINI_API_KEY` or set `LLM_PROVIDER=stub` |
| “That invite code is not correct.” | Wrong case, extra whitespace, code removed, or legacy `INVITE_CODE` ignored because `INVITE_CODES` is set | Check the exact code in `INVITE_CODES`; codes are case-sensitive |
| “This email is not on the invite list.” | Email missing from `ALLOWED_EMAILS` | Add the exact address (case-insensitive, comma-separated) and restart |
| 401 “Your session has expired.” | Cookie expired, `SESSION_SECRET` rotated, or cookies blocked | Sign in again; check browser cookie settings |
| 429 “You have reached the idea-generation limit.” | Per-session rate limit hit | Wait for the window, raise `IDEAS_RATE_LIMIT`, or restart the dev server to clear the in-memory store |
| Env changes have no effect | Next.js loads env at startup | Restart the dev server; on Vercel, redeploy |
| Port 3000 already in use | Another process is using it | `npm run dev -- -p 3001` or stop the other process |
| Docker login succeeds but API calls return 401 | `Secure` cookie over plain HTTP on a non-localhost host | Use HTTPS (tunnel/reverse proxy) or test via `localhost` |
| Build fails immediately | Unsupported Node version | Use Node 20.9+ / 22 (`node --version`) |
| Stale or odd build output | Old `.next` artifacts | `rm -rf .next && npm run build` |
| `npm ci` fails | Lockfile/Node mismatch | Use Node 22 and keep `package-lock.json` committed |
| Stub ideas look repetitive | Stub uses a small fixed local pool | Use `LLM_PROVIDER=gemini` for varied real generation |
| Page refreshes lose the shortlist | State is intentionally ephemeral | Expected; copy/share before refreshing |

### Still stuck?

1. Confirm `.env.local` sits next to `package.json` and is not committed.
2. Run `npm run verify` to separate code errors from environment errors.
3. Check the terminal running `npm run dev` for server-side errors.
4. Use the API smoke test above to verify login and generation independently of the UI.
5. For provider issues, temporarily set `LLM_PROVIDER=stub` to confirm the rest of the app works.

---

## Security and privacy

- **Access control:** allowlisted email + invite code, validated server-side only.
- **Session integrity:** HMAC-SHA-256 over a base64url payload, constant-time comparison, 7-day expiry.
- **Cookie:** `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production.
- **No secret exposure:** no `NEXT_PUBLIC_` secrets; provider errors are sanitized.
- **Input validation:** shape and size checks on all API payloads; 64 KB body cap.
- **Headers:** `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`; API routes send `Cache-Control: no-store`.
- **Link safety:** the server never fetches user URLs; the client only links `http:`/`https:`.
- **Privacy:** the UI asks for a nickname/persona only; there is no analytics, no database, and no server-side brief storage.
- **Rate limiting:** in-memory, per instance, keyed by session email. For a hard global limit, replace `src/lib/rate-limit.ts` with Upstash Redis or Vercel KV.

---

## Project structure

```text
.
├── src/
│   ├── app/
│   │   ├── api/auth/login/route.ts     # login + session cookie
│   │   ├── api/auth/logout/route.ts    # clear cookie
│   │   ├── api/ideas/round/route.ts    # idea generation endpoint
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # gate vs workspace (RSC)
│   │   └── globals.css
│   ├── components/                     # AccessGate, Workspace, IdeaGrid, Shortlist, …
│   └── lib/
│       ├── auth.ts                     # allowlist, invite codes, HMAC sessions
│       ├── session.ts                  # request session + cookie options
│       ├── validation.ts               # API payload/body validation
│       ├── rate-limit.ts               # in-memory sliding window
│       ├── brief.ts / summary.ts / currency.ts
│       └── llm/                        # provider selection + gemini/openai/stub
├── tests/                              # Vitest unit + route tests
├── design/                             # PRD, HLD, LLD, deployment, prototype
├── public/
├── Dockerfile
├── .env.example
├── next.config.ts                      # security headers
├── tailwind.config.ts
├── vitest.config.ts
└── package.json
```

---

## Design docs

Deeper background lives in `design/`:

- `design/product_requirements_document_prd.md` — product vision, users, functional requirements
- `design/HLD.md` — high-level architecture
- `design/LLD.md` — low-level design and module contracts
- `design/DEPLOYMENT.md` — deployment topology, limits, and go-live checklist
- `design/DESIGN.md` — UI/UX direction
- `design/code.html` — early prototype

---

## License

No license file is included in this repository. Add one before distributing or accepting external contributions.
