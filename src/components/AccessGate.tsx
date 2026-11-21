"use client";

import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Header from "./Header";
import PrivacyNotice from "./PrivacyNotice";

export default function AccessGate() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    if (!email.trim() || !inviteCode.trim()) {
      setError("Enter your invited email and personal invite code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), inviteCode: inviteCode.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Could not sign you in. Please try again.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header authenticated={false} />

      <main className="shell flex items-start justify-center py-8 md:py-16">
        <div className="w-full max-w-lg">
          <div className="card p-5 animate-fade-up sm:p-7 md:p-8">
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Private invitation</span>
              <h1 className="text-3xl font-bold tracking-tight text-ink md:text-[2rem]">
                Friend Access Gate
              </h1>
              <p className="text-sm leading-6 text-muted">
                Enter your invited email and personal invite code to begin private gift
                curation. No password, no account — just a short-lived session.
              </p>
            </div>

            <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="access-email" className="label">
                  Allowed email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted/70"
                    aria-hidden="true"
                  />
                  <input
                    id="access-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="input pl-10"
                    aria-invalid={Boolean(error)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="access-code" className="label">
                  Your invite code
                </label>
                <div className="relative">
                  <KeyRound
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted/70"
                    aria-hidden="true"
                  />
                  <input
                    id="access-code"
                    name="inviteCode"
                    type={showCode ? "text" : "password"}
                    autoComplete="off"
                    spellCheck={false}
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="Your personal code from the owner"
                    className="input pl-10 pr-11"
                    aria-invalid={Boolean(error)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode((value) => !value)}
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-line/60 hover:text-ink"
                    aria-label={showCode ? "Hide invite code" : "Show invite code"}
                  >
                    {showCode ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-rejected/20 bg-rejected-wash px-3.5 py-3 text-xs font-medium leading-5 text-rejected"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              ) : null}

              <PrivacyNotice compact />

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary mt-1 w-full py-3.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-4 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-3.5 text-secondary" aria-hidden="true" />
                7-day signed session
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                Invited friends only
              </span>
            </div>
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-muted">
            Not on the list? Ask the owner for an invite code and to add your email.
          </p>
        </div>
      </main>
    </>
  );
}
