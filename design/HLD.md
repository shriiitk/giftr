# High-Level Design (HLD): `giftr` (Gift Idea Finder)

## 1. High-Level Design (HLD)

### 1.1 System Overview
`giftr` is a mobile- and desktop-responsive web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **lucide-react**, deployed on **Vercel**. It helps invited friends turn a privacy-safe recipient profile and budget range into a 5-idea gift board, accept/reject items to refill rejected slots until locking in 2–3 final ideas, manually verify links/prices, attach a "Why it fits" note, and copy/share the final shortlist.

### 1.2 Architectural Principles
- **Browser-Local / Stateless Server:** No long-term database is used. Active form inputs, 5-slot cards, shortlisted items, and "Why it fits" notes stay in React/client state and are saved to a versioned, email-scoped `localStorage` snapshot so a refresh restores them. **New Person / Reset** (optionally preserving currency and location defaults) or sign-out clears the snapshot.
- **Lightweight Friend Auth:** Access is gated via an allowlisted email (`ALLOWED_EMAILS`) and one of a comma-separated list of per-friend invite codes (`INVITE_CODES`; legacy `INVITE_CODE` still supported), issuing a **7-day signed `HttpOnly` cookie** (`SESSION_SECRET`) to protect Gemini API quota from public abuse. Removing a single code revokes only that friend's future logins.
- **Provider-Agnostic LLM Adapter:** Server routes call an abstraction (`LlmProvider`) rather than hardcoding a single SDK everywhere, defaulting to **Google Gemini** and allowing future swap-in of another LLM provider (e.g., an OpenAI-compatible endpoint or alternative free provider) via environment configuration.
- **No Backend URL Validation:** Any `exactUrl` returned by the model is passed through directly without server-side HTTP probing/validation, alongside a companion search link and an explicit UI notice to verify links and live prices manually.

### 1.3 Component & Data Flow Diagram
```text
+-----------------------------------------------------------------------+
|                    Browser Client (Mobile & Desktop)                  |
|  - Access Gate Form (Email + Invite Code)                             |
|  - Intake Form (Nickname, Occasion, Budget Min/Max + Currency, Likes,   |
|    Collapsible Optional: Age, Gender, Location, Job,                  |
|    Chips + Free-Text: Already Owns & Do Not Want, Quick Presets)      |
|  - 5-Slot Card Grid (Accept / Reject + Reason Tag, Exact & Search Link, |
|    "Verify link & price yourself" notice, Replace Rejected)           |
|  - Final Shortlist (2-3 Ideas) + "Why it fits" Note + Copy/Share      |
|  - "New Person / Reset" (optionally keeping Currency & Location)       |
+-----------------------------------+-----------------------------------+
                                    | HTTPS (JSON + 7-Day Signed Cookie)
                                    v
+-----------------------------------------------------------------------+
|               Next.js App Router Route Handlers (Vercel)              |
|  - POST /api/auth/login    -> Validates email + invite code, sets     |
|                               7-day signed cookie                   |
|  - POST /api/auth/logout   -> Clears session cookie                   |
|  - POST /api/ideas/round   -> Checks cookie & rate limit; calls       |
|                               LlmProvider (initial 5 or refill slots) |
|  - (Optional Future Hook)  -> Can delegate to an external Python API   |
|                               service if needed later                 |
+-----------------------------------+-----------------------------------+
                                    | Server-side API call
                                    v
+-----------------------------------------------------------------------+
|                 Swappable LLM Provider Layer (Server)                 |
|  - Primary: Gemini Provider (GEMINI_API_KEY, GEMINI_MODEL)            |
|  - Future Swap: Alternative Provider (LLM_PROVIDER, alt key/endpoint) |
+-----------------------------------------------------------------------+