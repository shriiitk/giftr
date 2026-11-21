import { ShieldCheck } from "lucide-react";

interface PrivacyNoticeProps {
  className?: string;
  compact?: boolean;
}

export default function PrivacyNotice({ className = "", compact = false }: PrivacyNoticeProps) {
  return (
    <div
      role="note"
      className={`flex items-start gap-3 rounded-xl border border-secondary/20 bg-secondary-wash/70 text-secondary ${
        compact ? "p-3.5" : "p-4"
      } ${className}`}
    >
      <ShieldCheck className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <p className={`${compact ? "text-xs leading-5" : "text-[13px] leading-6"}`}>
        <strong className="font-bold">Privacy reminder:</strong> Use a nickname or persona
        label only. Never enter full names, street addresses, phone numbers, or other
        sensitive personal data.
      </p>
    </div>
  );
}
