import { Lock } from "lucide-react";
import Brand from "./Brand";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-[#F6F3EE]">
      <div className="shell flex flex-col items-start justify-between gap-3 py-5 text-xs text-muted sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Brand size="sm" />
          <span className="hidden text-muted/80 sm:inline">· Editorial gift discovery</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5 text-secondary" aria-hidden="true" />
            Local private curation
          </span>
          <span>© {new Date().getFullYear()} Gift Idea Finder</span>
        </div>
      </div>
    </footer>
  );
}
