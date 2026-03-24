import type { Id } from "@/convex/_generated/dataModel";
import { Field, Section, SelectPills } from "@/features/admin/onboarding/ui";
import type { EmployeeAssignRole } from "@/features/admin/onboarding/types";
import { Text } from "react-native";

type EmployeeOption = {
  _id: Id<"employees">;
  fullName: string;
};

type EmployeeStepProps = {
  employeeForm: {
    fullName: string;
    email: string;
    phone: string;
  };
  onChangeEmployeeForm: (
    updater: (prev: { fullName: string; email: string; phone: string }) => {
      fullName: string;
      email: string;
      phone: string;
    },
  ) => void;
  employees: EmployeeOption[];
  selectedEmployeeId: Id<"employees"> | null;
  onSelectEmployee: (value: Id<"employees">) => void;
  selectedAssignRole: EmployeeAssignRole;
  onSelectAssignRole: (value: EmployeeAssignRole) => void;
  selectedSalonAssignedEmployeesCount: number;
};

export function AdminOnboardingStepEmployee(props: EmployeeStepProps) {
  return (
    <Section
      title="3. Opret og tilknyt medarbejder"
      subtitle="Opret én medarbejder og tilknyt til salonen. Når du fortsætter, gemmer vi tilknytningen."
    >
      <Field
        label="Fulde navn"
        value={props.employeeForm.fullName}
        onChangeText={(value) =>
          props.onChangeEmployeeForm((prev) => ({ ...prev, fullName: value }))
        }
      />

      <Field
        label="Email"
        value={props.employeeForm.email}
        onChangeText={(value) =>
          props.onChangeEmployeeForm((prev) => ({ ...prev, email: value }))
        }
        keyboardType="email-address"
      />

      <Field
        label="Telefon"
        value={props.employeeForm.phone}
        onChangeText={(value) =>
          props.onChangeEmployeeForm((prev) => ({ ...prev, phone: value }))
        }
      />

      <SelectPills
        options={props.employees.map((employee) => ({
          label: employee.fullName,
          value: employee._id,
        }))}
        selected={props.selectedEmployeeId}
        onSelect={props.onSelectEmployee}
      />

      <SelectPills
        options={[
          { label: "Owner", value: "owner" as const },
          { label: "Manager", value: "manager" as const },
          { label: "Stylist", value: "stylist" as const },
          { label: "Assistant", value: "assistant" as const },
        ]}
        selected={props.selectedAssignRole}
        onSelect={props.onSelectAssignRole}
      />

      <Text selectable className="text-xs text-neutral-500">
        Tilknyttede ansatte i salon: {props.selectedSalonAssignedEmployeesCount}
      </Text>
    </Section>
  );
}
