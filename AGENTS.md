# AGENTS.md — giftr

Single source of truth for coding agents. `CLAUDE.md` only imports this file.

## What this is

`giftr` is a private, invite-only gift-shortlist web app. A friend signs in with an allowlisted email + invite code, describes a recipient with a privacy-safe nickname, budget, and interests, gets 5 gift ideas, accepts/rejects/replaces cards, and narrows to 2–3 finalists with a copyable/shareable note.

- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 3, Vitest 3.
- No database, accounts, checkout, analytics, or server-side brief storage.
- Deeper docs: `README.md`, `design/product_requirements_document_prd.md`, `design/HLD.md`, `design/LLD.md`, `design/DEPLOYMENT.md`, `design/DESIGN.md`.
- Note: root `prd.md` and `design_doc.md` do not exist in this repo; use the `design/` paths above.

## Commands (repo root)

| Task | Command |
| --- | --- |
| Install (lockfile) | `npm ci` |
| Dev server | `npm run dev` (http://localhost:3000) |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit/integration tests | `npm test` (67 tests / 8 files) |
| Watch tests | `npm run test:watch` |
| Production build | `npm run build` |
| Serve production build | `npm start` |
| Full gate | `npm run verify` (lint + typecheck + test + build) |

- Node.js 20.9+ required; Node 22 recommended (Docker uses `node:22-alpine`).
- Tests use the `stub` provider and need no API key or network.
- Before finishing a task, run `npm run lint` and `npm run build`; prefer `npm run verify`.

## Local environment

- Copy `.env.example` to `.env.local`; never commit `.env*` (only `.env.example` is tracked).
- Required: `ALLOWED_EMAILS`, `INVITE_CODES` (preferred) or legacy `INVITE_CODE`, `SESSION_SECRET`.
- Provider: `LLM_PROVIDER=gemini|openai|openai-compatible|stub` (default `gemini`).
  - Gemini: `GEMINI_API_KEY`, optional `GEMINI_MODEL` (default `gemini-2.5-flash`).
  - OpenAI-compatible: `OPENAI_API_KEY`, optional `OPENAI_BASE_URL`, `OPENAI_MODEL`.
  - No key needed for `stub`.
- Rate limiting: `IDEAS_RATE_LIMIT` (default 8), `IDEAS_RATE_WINDOW_SECONDS` (default 600).
- Generate `SESSION_SECRET` with `openssl rand -base64 48`. Restart the dev server after env changes.
- Never expose server secrets via `NEXT_PUBLIC_*`.

## Architecture map

- `src/app/page.tsx` — RSC entry; reads `giftr_session` and renders `AccessGate` or `Workspace`.
- `src/app/api/auth/login/route.ts` — validates credentials, sets the 7-day cookie.
- `src/app/api/auth/logout/route.ts` — clears the cookie.
- `src/app/api/ideas/round/route.ts` — session check, 64 KB body guard, rate limit, validation, provider call.
- `src/lib/auth.ts` — allowlist, invite codes, HMAC-SHA-256 session tokens, constant-time compare.
- `src/lib/session.ts` — request cookie read + cookie options.
- `src/lib/validation.ts` — brief/slot validation and body-size guard.
- `src/lib/rate-limit.ts` — in-memory sliding window keyed by session email.
- `src/lib/llm/` — `provider.ts` selection; `gemini.ts`, `openai-compatible.ts`, `stub.ts`, `parse.ts`, `prompts.ts`, `types.ts`.
- `src/lib/types.ts` — shared types/constants (5 slots, 2–3 finalists, 64 KB, max budget).
- `src/components/` — `Workspace` owns client state; `AccessGate`, `IntakeForm`, `IdeaGrid`, `IdeaCard`, `Shortlist`, `ResetDialog`, etc.
- `tests/` — Vitest unit + route tests.

## Invariants (do not break)

- **Ephemeral only:** brief, cards, finalists, and note live in React state. Refresh clears them. No DB, `localStorage`, `sessionStorage`, or server-side brief storage.
- **Access gate:** allowlisted email (case-insensitive) + any active invite code (case-sensitive). `INVITE_CODES` takes precedence over legacy `INVITE_CODE`. Removing one code blocks future logins with it without affecting other codes; existing 7-day sessions remain until expiry or `SESSION_SECRET` rotation.
- **Session:** `giftr_session`, `HttpOnly`, `SameSite=Lax`, `Path=/`, 7 days (`604800`s), `Secure` only when `NODE_ENV=production`.
- **Ideas API:** auth required; rejects bodies >64 KB; rate-limits per session email; slots are unique integers 1–5; server assigns slot numbers; returns exactly the requested count; no automatic retries.
- **Shortlist:** accept at most 3; need at least 2 to view; replace only rejected slots; accepted cards stay in place.
- **Links:** the server never fetches/probes `exactUrl`; it passes model output through. Clickable links are gated by `safeExternalUrl` (http/https only); every idea gets a Google search fallback via `buildSearchUrl`; always show the “verify link & live price” notice.
- **Privacy:** nickname/persona only; no full names, addresses, phone numbers, or other PII; no checkout/purchasing; no analytics.
- **Provider contract:** `LlmProvider.generateIdeas(input)` returns `GeneratedIdea[]`. Missing key/unknown provider → `503`; provider failure → `502`; 25s timeout. No silent fallback in production; `stub` is explicit for local/CI.
- **No server URL scraping/validation:** don't add backend fetch/probing of model URLs.

## Security & ops hygiene

- Never commit `.env`, `.env.local`, keys, certs, or tokens. `.env.example` documents every variable; update it when env vars change.
- Keep secrets server-side; no `NEXT_PUBLIC_` secrets.
- Preserve security headers in `next.config.ts` and `Cache-Control: no-store` on API routes.
- Keep auth comparisons constant-time; never log tokens, secrets, or full briefs.
- Rate limiting is best-effort per server instance; don't claim a global quota. For a hard/shared limit, replace the store behind `src/lib/rate-limit.ts` (e.g. Upstash/Vercel KV).
- Deployment: Vercel is the primary target; Docker/Node hosts are supported. See `design/DEPLOYMENT.md`. Production cookies are `Secure`, so use HTTPS outside localhost.

## Current status vs design docs

- Implemented: access gate, presets, 5-slot board, accept/reject/replace, 2–3 shortlist, note, copy/share, provider adapter, rate limiting, 67 tests.
- Not implemented (some are explicit non-goals): external Python API hook (HLD future), image/media cards, confidence scores, heart/bookmark icons, filter drawer (DESIGN.md concepts), refresh persistence, shared/global rate limit.
- Known doc drift: LLD says `validateCredentials` returns `reason`; code returns `{ status, error }`. LLD says body size is checked via `Content-Length`; code reads the body bytes. LLD says the search URL uses title + currency; code also includes location and “buy”. LLD calls the stub deterministic; it is deterministic only for the same seed, while the route seed includes a timestamp.
- Treat the code as the source of truth; update docs when behavior changes.

## Maintenance rule

If you change architecture, env vars, API contracts, commands, or invariants, update `AGENTS.md` in the same change. Also update `.env.example`, `README.md`, and the relevant `design/` doc when applicable. Keep `CLAUDE.md` as a pointer only (`@AGENTS.md`) to avoid drift.
