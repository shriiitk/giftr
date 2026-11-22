# Deployment Architecture — `giftr` (Gift Idea Finder)

- **Version:** 1.2
- **Status:** Approved; implementation-aligned
- **Primary target:** Vercel Hobby (free tier)
- **Alternate targets:** Cloudflare Workers/Pages via OpenNext, or any Node.js 20+ host / Docker

---

## 1. Objectives

- Run at **$0/month** on free tiers.
- Keep all secrets server-side; never expose Gemini/OpenAI keys or auth configuration to the browser.
- Protect free-tier LLM quota with a friend allowlist, per-friend invite codes, and per-session rate limiting.
- Support mobile and desktop clients over HTTPS with low operational overhead.
- Ship a reproducible build that passes lint, typecheck, tests, and `next build`.

---

## 2. Production Topology (Vercel)

```text
                    ┌───────────────────────────────────────────┐
                    │           Friends' browsers               │
                    │   mobile (<768px) / laptop (>=768px)      │
                    └──────────────────┬────────────────────────┘
                                       │ HTTPS
                                       ▼
              ┌──────────────────────────────────────────────────┐
              │                Vercel Edge Network               │
              │  TLS termination · CDN · DDoS/bot mitigation     │
              └──────────────────┬───────────────────────────────┘
                                 │
                 ┌───────────────┴────────────────┐
                 │                                │
                 ▼                                ▼
      ┌─────────────────────┐          ┌──────────────────────────┐
      │  Next.js Static /   │          │  Next.js Serverless      │
      │  RSC pages          │          │  Route Handlers (Node)   │
      │  layout, page shell │          │  /api/auth/login         │
      │                     │          │  /api/auth/logout        │
      │                     │          │  /api/ideas/round        │
      └─────────────────────┘          └────────────┬─────────────┘
                                                    │ HTTPS (server-side only)
                                                    ▼
                                     ┌──────────────────────────────┐
                                     │  Gemini API (free tier)      │
                                     │  or OpenAI-compatible API    │
                                     │  or StubProvider (demo)      │
                                     └──────────────────────────────┘

      In-memory rate-limit map lives inside each serverless instance.
      No database. No persistent user data.
```

**Request path**

1. `GET /` → Vercel serves the RSC page; cookie presence decides `AccessGate` vs `Workspace`.
2. `POST /api/auth/login` → validates allowlist + one active invite code, signs 7-day HMAC cookie.
3. `POST /api/ideas/round` → verifies cookie, rate limits, validates payload, calls the provider, returns 1–5 ideas.
4. Browser keeps all brief/card/note state in React memory; nothing is stored server-side.

---

## 3. Environment Configuration (Vercel Project Settings)

| Key | Scope | Required | Notes |
| --- | --- | --- | --- |
| `ALLOWED_EMAILS` | Production, Preview | Yes | Comma-separated; case-insensitive |
| `INVITE_CODES` | Production, Preview | Yes | Comma-separated per-friend codes; remove one to revoke it |
| `INVITE_CODE` | Production, Preview | No | Legacy single code; ignored when `INVITE_CODES` is set |
| `SESSION_SECRET` | Production, Preview | Yes | 32+ random chars; rotate to invalidate all sessions |
| `GEMINI_API_KEY` | Production, Preview | Yes (gemini) | Server-only; never `NEXT_PUBLIC_` |
| `GEMINI_MODEL` | Production, Preview | No | Default `gemini-2.5-flash` |
| `LLM_PROVIDER` | Production, Preview | No | `gemini` (default), `openai`, `stub` |
| `OPENAI_API_KEY` | Optional | If `openai` | Server-only |
| `OPENAI_BASE_URL` | Optional | No | Default `https://api.openai.com/v1` |
| `OPENAI_MODEL` | Optional | No | Default `gpt-4o-mini` |
| `IDEAS_RATE_LIMIT` | Optional | No | Default `8` requests/window |
| `IDEAS_RATE_WINDOW_SECONDS` | Optional | No | Default `600` |

**Secret hygiene:** set values for Production and Preview separately. Never commit `.env.local`. `.env.example` contains placeholders only. Rotating `SESSION_SECRET` signs everyone out immediately.

---

## 4. Build & Release Pipeline

```text
Developer
  └─ git push / PR
       ├─ npm ci
       ├─ npm run lint
       ├─ npm run typecheck
       ├─ npm run test
       ├─ npm run build
       └─ Vercel build (independent, immutable)
             ├─ Preview deployment (PR)
             └─ Production deployment (main)
```

**Vercel settings**

- Framework preset: Next.js (auto-detected)
- Install command: `npm ci`
- Build command: `npm run build`
- Output: `.next` (managed by Vercel)
- Node.js: 20.x or 22.x (Next 16 requires ≥20.9)
- Function region: closest to the friend group (e.g., `bom1` for India) to reduce LLM latency
- Function max duration: default is sufficient (LLM call has a 25s server-side abort)

**Recommended local pre-push gate**

```bash
npm run verify   # lint + typecheck + test + build
```

---

## 5. Runtime Behavior & Limits

### Rate limiting

- Implemented in memory per serverless instance: default 8 idea generations / 10 minutes / session email.
- Serverless instances can scale horizontally, so the effective global limit is `instances × limit`. This is acceptable for a private friend circle and prevents accidental rapid-fire loops.
- If a hard global limit is ever needed, swap `src/lib/rate-limit.ts` for Upstash Redis (`@upstash/ratelimit`) or Vercel KV. The interface (`consume(key, now)`) is intentionally small.
- `429` responses include `Retry-After` so the UI can explain the wait.

### LLM quota protection

- Only allowlisted, cookie-authenticated users can reach the provider.
- One call generates all 5 initial ideas; one call refills all rejected slots.
- No automatic retries on provider errors (avoids quota amplification). The user can retry manually.
- Provider timeouts are capped at 25 seconds.

### Data lifecycle

- No database, no server logs containing recipient briefs.
- Cookie payload contains only the email and expiry, is `HttpOnly`, and expires after 7 days.
- The workspace is saved in the browser under `giftr_workspace_v1:<email>` so a refresh restores it and friends sharing a browser stay isolated. New Person / Reset and sign-out clear it. No brief data is stored server-side.

### Caching

- API routes send `Cache-Control: no-store`.
- The app shell is static where possible; session-dependent rendering happens in the RSC page.

---

## 6. Security Controls

| Control | Implementation |
| --- | --- |
| Transport | HTTPS enforced by Vercel |
| Session integrity | HMAC-SHA-256 over base64url payload; constant-time compare |
| Cookie | `HttpOnly; SameSite=Lax; Path=/; Max-Age=604800; Secure` in production |
| Access control | Allowlisted email + per-friend invite code list, server-side only |
| Secret exposure | No `NEXT_PUBLIC_` secrets; API errors sanitized |
| Header hardening | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` |
| Input validation | Shape/size checks on all API payloads; 64 KB cap |
| URL safety | Backend never fetches URLs; client only links `http:`/`https:` |
| Privacy | Nickname/persona guidance, no PII storage, no analytics |

**Optional hardening (post-MVP):** add a strict Content-Security-Policy, CSRF token for auth POSTs (SameSite=Lax already mitigates cross-site form posts for JSON endpoints), and Upstash-backed rate limiting.

---

## 7. Observability & Operations

- **Vercel deployment logs:** route handler errors are logged with a short code; no secrets or full briefs.
- **Health check:** `GET /` returns 200; `POST /api/ideas/round` without a cookie returns 401 (useful smoke test).
- **Quota monitoring:** watch Gemini API usage in Google AI Studio; watch Vercel function invocations.
- **Alerts (free):** Vercel deployment failure notifications; optional uptime check on `/`.
- **Incident playbook:**
  1. Remove the affected code from `INVITE_CODES` to revoke that friend only, or rotate `INVITE_CODES` / `SESSION_SECRET` to cut off all access.
  2. Set `LLM_PROVIDER=stub` to keep the UI usable while a provider is down (demo data only).
  3. Roll back via Vercel's instant deployment rollback.
  4. Check provider status pages and quota dashboards.

---

## 8. Alternate Deployment Targets

### 8.1 Cloudflare Workers / Pages (OpenNext)

- Use `@opennextjs/cloudflare` to build the Next app for Workers.
- Set the same environment variables as Worker secrets/vars.
- Caveats: Node APIs used here are Web-standard (Web Crypto, fetch), so compatibility is good; in-memory rate limiting is per-isolate; verify `next/font`/image behavior (none used).
- Free tier: Workers/Pages free plan; no database required.

### 8.2 Docker / any Node host (Render, Fly.io, Railway, VPS)

The repository includes a multi-stage `Dockerfile`:

```bash
docker build -t giftr .
docker run --rm -p 3000:3000 --env-file .env.local giftr
```

The image uses `node:22-alpine`, runs `npm ci` and `npm run build`, then serves the
production build with `npm start`. `next.config.ts` is copied into the runtime image so the
security headers remain active.

- Inject env vars via the platform's secret manager (not the image).
- Put the container behind TLS (platform-managed or Caddy/Nginx).
- In-memory rate limits are per container; run a single instance or add Redis.

---

## 9. Cost Model (Free Tier)

| Component | Plan | Cost |
| --- | --- | --- |
| Vercel hosting | Hobby | $0 |
| Gemini API | Free tier (subject to quota) | $0 |
| Domain (optional) | Existing / Vercel subdomain | $0 |
| Database | None | $0 |
| Monitoring | Vercel built-in + optional uptime checker | $0 |

**Scaling trigger:** if the friend circle grows beyond free-tier LLM quota or requires shared rate limits, add Upstash Redis (free tier) and/or a paid Gemini tier. The app architecture does not change.

---

## 10. Go-Live Checklist

- [ ] `ALLOWED_EMAILS`, `INVITE_CODES`, `SESSION_SECRET`, `GEMINI_API_KEY` set in Vercel Production.
- [ ] Preview environment uses separate invite codes or is protected by Vercel Authentication.
- [ ] `npm run verify` passes locally (lint, typecheck, tests, build).
- [ ] Smoke test: unauthenticated `/` shows access gate; valid login sets cookie; invalid code rejected.
- [ ] Generate 5 ideas, accept 2, reject 1, replace rejected slot, verify accepted cards stay.
- [ ] Copy summary and native share verified on mobile + desktop.
- [ ] `SESSION_SECRET` and `INVITE_CODES` stored in a password manager.
- [ ] Rate limit values reviewed for expected friend count.
- [ ] Privacy copy visible on access gate and intake form.
- [ ] Rollback plan confirmed (Vercel previous deployment).

---

## 11. Open Questions for Review

1. **Primary host:** Vercel Hobby is assumed. Confirm, or choose Cloudflare/Docker.
2. **Region:** deploy close to most friends (e.g., `bom1`). Confirm expected region.
3. **Rate limits:** 8 requests / 10 minutes per session — adjust for your group size.
4. **Provider:** Gemini free tier as default; confirm model availability (`gemini-2.5-flash`) or provide the exact model ID.
5. **Preview protection:** should Preview deployments be private (Vercel Authentication) to avoid burning quota? Recommended: yes.
6. **Custom domain:** use the free `*.vercel.app` domain or attach an existing domain?

Please review this deployment architecture and confirm or adjust the items in §11. I will revise until approved.
