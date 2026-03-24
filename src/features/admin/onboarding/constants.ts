import type { OnboardingStep } from "./types";

export const WEEK_DAYS = [
  { weekday: 0, label: "Søn" },
  { weekday: 1, label: "Man" },
  { weekday: 2, label: "Tir" },
  { weekday: 3, label: "Ons" },
  { weekday: 4, label: "Tor" },
  { weekday: 5, label: "Fre" },
  { weekday: 6, label: "Lør" },
] as const;

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  "Salon",
  "Åbningstider",
  "Ansatte",
  "Arbejdstider",
  "Services",
] as const;
