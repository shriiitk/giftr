# Product Requirements Document (PRD) — Gift Idea Finder (`giftr`)

- **Product Name:** Gift Idea Finder
- **Codebase / Project Slug:** `giftr`
- **Version:** 5.1 (Per-friend invite codes)
- **Status:** Locked for Architecture & Implementation

---

## 1. Problem & Product Vision

### Problem Statement
Buying a thoughtful gift for someone you know well is surprisingly difficult—not because there is a shortage of online stores, but because without a focused shortlist, people waste time scrolling endlessly or default to safe, repetitive gifts.

### Product Vision
**Gift Idea Finder** (`giftr`) is a fast, lightweight, mobile- and laptop-responsive web application built for you and an invited circle of friends. It converts a privacy-safe recipient profile and **budget range** into **5 curated gift ideas**, lets users **accept or reject** cards to **refill rejected slots** until they converge on **2–3 final ideas**, encourages manual verification of exact price-source links, and makes it effortless to **copy or share** the final 2–3 ideas (along with a *"Why it fits"* note) with themselves or friends—without long-term data persistence or infrastructure clutter.

### Explicit Non-Goals
- **No Automated Purchasing:** The app never buys items or acts as a checkout storefront.
- **No Long-Term Server Persistence:** No user accounts, multi-tenant database storage, or long-term server-side note history.

---

## 2. Target Audience, Access Control & Privacy

### Target Users
- The app creator and a small circle of invited friends accessing the web app on **mobile phones** (`< 768px`) and **laptops/desktops** (`>= 768px`).

### Lightweight Friend Access Gate
- **Allowlisted Email + Invite Codes:**
  - Users unlock the app by entering an **allowlisted email address** (configured via environment variable `ALLOWED_EMAILS`) **plus one active invite code** from a comma-separated list (`INVITE_CODES`) managed by the owner.
  - Each friend can receive a distinct code so one code can be revoked without affecting everyone else. The legacy single `INVITE_CODE` remains supported as a fallback when `INVITE_CODES` is not set.
  - Validating both issues a signed, `HttpOnly` session cookie so friends remain signed in during their session while blocking uninvited public visitors and bots from consuming free-tier **Gemini API** credits.

### Privacy & Browser-Local Session Hygiene
- **PII Guardrail:** The UI displays a clear privacy reminder instructing users to enter a nickname or persona label only—**never** full names, street addresses, phone numbers, or sensitive personal data.
- **Browser-Local State:** Active recipient inputs, the 5-slot board, locked finalists, and *"Why it fits"* notes are saved in this browser so a refresh restores them, and are cleared by an explicit New Person / Reset or sign-out. No database or server-side brief storage is used.

---

## 3. Functional Requirements

### FR-1: Quick Start, Recipient Intake & "New Person / Reset"
1. **Quick-Start Presets (Optional):**
   - Provide 2–3 one-tap sample starting presets (e.g., *Coffee & desk fan*, *New apartment host*, *Weekend traveler*) to eliminate blank-screen friction on first visit.
2. **Core Intake Fields:**
   - **Recipient Nickname / Persona Label** (privacy-safe label, e.g., *"The Coffee Purist"* or *"Rohan (College)"*).
   - **Occasion** (quick-select chips such as *Birthday*, *Housewarming*, *Thank You*, *Festive / Holiday*, *Just Because* + custom text input).
   - **Budget Range & Currency** (Minimum and Maximum budget inputs + currency selector supporting `INR (₹)`, `USD ($)`, `EUR (€)`, `GBP (£)`).
   - **Likes / Interests** (free-text input/textarea for hobbies, routines, style, and preferences).
3. **Optional Context Fields:**
   - Collapsible on mobile to keep the primary CTA accessible; visible in a clean grid on laptop.
   - Fields: **Age** (or age bracket), **Gender**, **Location** (city/region/country for local availability and currency/shopping context), and **Job / Role**.
4. **Guided Suggestion Chips + Free Text for Exclusions:**
   - **"Already Owns"** and **"Do Not Want"** each provide **6–8 clickable toggle chips** (e.g., *Already Owns:* `Wireless earbuds`, `Smartwatch`, `Books / Kindle`, `Basic ceramic mug`, `Scented candles`, `Canvas tote bag`; *Do Not Want:* `Gift cards`, `Dust collector decor`, `Fragile glassware`, `Gag / novelty gifts`, `Sizing / clothes`, `Subscriptions`) **plus** a free-text input for custom additions.
5. **"New Person / Reset" Action:**
   - Clears active recipient details, 5-slot cards, finalists, and notes in one click, with a toggle/option to **keep Currency & Location defaults** when starting a search for another person.

### FR-2: 5-Slot Interactive Card Grid & Slot-Replacement Narrowing
1. **Round 1 Generation (5 Ideas):**
   - Submitting the form calls the backend **Gemini API** at runtime using structured JSON output to generate **5 distinct gift idea cards** within the user's **Min–Max budget range** and selected currency.
2. **Gift Idea Card Contents:**
   - **Slot Number & Status:** (`Reviewing`, `Accepted`, or `Rejected`).
   - **Gift Title & Concise Description.**
   - **Estimated Price:** Formatted in the user's currency and aligned with the Min–Max budget range.
   - **"Why It Fits" Rationale:** Concise explanation tying the gift to likes and optional context while honoring exclusions.
   - **Links & Verification Guardrail:**
     - **Primary Exact Link:** The specific URL where the price/item reference was sourced (when genuinely available).
     - **Secondary Search Link:** A safe fallback search URL for that item in the user's region/currency.
     - **Explicit Verification Warning:** *"Links and prices can change or be inaccurate—open and verify the link and live price yourself before buying."*
3. **Accept, Reject & Refill Rejected Slots:**
   - Users can **Accept** cards (pinning/shortlisting toward the target of **2–3 final ideas**) or **Reject** cards (with optional quick rejection reason tags such as *Too expensive*, *Wrong style*, *Too similar*).
   - Clicking **"Replace Rejected"** calls the backend Gemini API to generate **new ideas strictly for the rejected slots**, keeping accepted cards intact in their slots so the user continues comparing **5 options** until locking in their **final 2–3 ideas**.
   - A visible **Shortlist Progress Counter (`0–3 of 2–3 finalists`)** tracks progress.

### FR-3: Final Shortlist (2–3 Ideas), "Why It Fits" Note & One-Tap Copy / Share
1. **Final Shortlist View (2–3 Ideas):**
   - Displays the user's locked **2–3 final gift ideas** with accurate item prices and combined summary.
2. **Optional "Why It Fits" Personal Note:**
   - Editable note field where the user can record *why* the chosen gift fits (and any taste insights) so they can copy it into their personal notes for future gifting occasions.
3. **One-Tap Copy & Share (Self or Friends):**
   - Formats the final 2–3 ideas, estimated prices, exact/search links, price-verification reminder, and optional *"Why it fits"* note into clean, readable text.
   - Provides **Copy Summary** (clipboard copy for personal notes, WhatsApp, or email) and **Share** (native Web Share API on supported mobile/desktop browsers, falling back to clipboard copy).

### FR-4: Navigation & Responsive Experience (Mobile & Laptop)
- **Clean Navigation:**
  - Unauthenticated users see only the **Access Gate**.
  - Authenticated users navigate cleanly between **Find Ideas** (Intake), **5-Slot Grid**, and **Shortlist (2–3)**, with **New Person / Reset** easily accessible in the header.
- **Responsive Breakpoints:**
  - **Mobile (`< 768px`):** Single-column layout, collapsible optional context fields, compact chip rows, thumb-friendly Accept/Reject buttons, and a sticky bottom action bar for *Replace Rejected* and *Shortlist (2–3)*.
  - **Laptop/Desktop (`>= 768px`):** Spacious multi-column card grid and clear side-by-side/drawer shortlist export view.

---

## 4. Non-Functional Requirements & Guardrails

1. **$0/Month Free-Tier Budget:**
   - Built and hosted strictly on free tiers (Google Stitch prototype, OpenCode with free LLMs, Gemini API free tier, and Vercel Hobby or Cloudflare Pages—with **zero database dependencies**).
2. **API Key & Quota Protection:**
   - `GEMINI_API_KEY`, `ALLOWED_EMAILS`, `INVITE_CODES` (and legacy `INVITE_CODE`), and `SESSION_SECRET` reside strictly in server environment variables and are never exposed to the browser.
   - Lightweight per-session rate limiting prevents accidental rapid-fire API calls from exhausting free-tier Gemini limits.
3. **Link & Price Integrity:**
   - External links open safely in a new tab (`target="_blank" rel="noopener noreferrer"`), validate `http:`/`https:` schemes, and always display a manual price/link verification notice.