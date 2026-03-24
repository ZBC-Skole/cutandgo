import { DayEditor, Section } from "@/features/admin/onboarding/ui";
import type { DayDraft } from "@/features/admin/onboarding/types";
import { Text } from "react-native";

type EmployeeHoursStepProps = {
  employeeWeek: DayDraft[];
  setEmployeeWeek: (rows: DayDraft[]) => void;
};

export function AdminOnboardingStepEmployeeHours(
  props: EmployeeHoursStepProps,
) {
  return (
    <Section
      title="4. Sæt arbejdstider"
      subtitle="Sæt ugentlig arbejdstid for valgt medarbejder. Når du fortsætter, gemmer vi tiderne."
    >
      <DayEditor rows={props.employeeWeek} onChange={props.setEmployeeWeek} />
      <Text selectable className="text-xs text-neutral-500">
        Tip: brug lukkedage for fridage.
      </Text>
    </Section>
  );
}
