import { DayEditor, Section } from "@/features/admin/onboarding/ui";
import type { DayDraft } from "@/features/admin/onboarding/types";
import { Text } from "react-native";

type OpeningHoursStepProps = {
  salonWeek: DayDraft[];
  setSalonWeek: (rows: DayDraft[]) => void;
};

export function AdminOnboardingStepOpeningHours(props: OpeningHoursStepProps) {
  return (
    <Section
      title="2. Sæt åbningstider"
      subtitle="Sæt salonens åbningstider for hele ugen. Når du fortsætter, gemmer vi tiderne."
    >
      <DayEditor rows={props.salonWeek} onChange={props.setSalonWeek} />
      <Text selectable className="text-xs text-neutral-500">
        Tip: du kan altid ændre tiderne senere i admin.
      </Text>
    </Section>
  );
}
