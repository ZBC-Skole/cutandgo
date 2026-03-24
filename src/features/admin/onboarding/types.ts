export type DayDraft = {
  weekday: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
};

export type EmployeeAssignRole = "owner" | "manager" | "stylist" | "assistant";

export type OnboardingStep =
  | "Salon"
  | "Åbningstider"
  | "Ansatte"
  | "Arbejdstider"
  | "Services";
