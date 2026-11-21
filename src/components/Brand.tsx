import { Gift } from "lucide-react";

interface BrandProps {
  size?: "sm" | "md";
}

export default function Brand({ size = "md" }: BrandProps) {
  const isSmall = size === "sm";

  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid place-items-center rounded-full bg-primary text-white shadow-sm ${
          isSmall ? "size-7" : "size-9"
        }`}
        aria-hidden="true"
      >
        <Gift className={isSmall ? "size-3.5" : "size-[18px]"} strokeWidth={2} />
      </span>
      <span
        className={`font-display font-bold tracking-tight text-ink ${
          isSmall ? "text-base" : "text-lg"
        }`}
      >
        Gift Idea Finder
      </span>
    </div>
  );
}
