"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  selected?: boolean;
  variant?: "default" | "reject";
  children: ReactNode;
}

export default function Chip({
  selected = false,
  variant = "default",
  className = "",
  children,
  type = "button",
  ...rest
}: ChipProps) {
  const selectedClass = selected
    ? variant === "reject"
      ? "chip-reject"
      : "chip-selected"
    : "";

  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`chip ${selectedClass} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
