import type { ReactNode } from "react";

export type AdminHref =
  | "/admin"
  | "/employees"
  | "/services"
  | "/(settings)/admin";

export type AdminTone = "neutral" | "warm" | "dark";
export type AdminBadgeTone = "neutral" | "success" | "warning" | "dark";

export type AdminButtonVariant = "primary" | "secondary" | "ghost";

export type AdminSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
};
