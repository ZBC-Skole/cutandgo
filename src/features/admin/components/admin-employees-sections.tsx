import type { Id } from "@/convex/_generated/dataModel";
import {
  AdminButton,
  AdminDayScheduleEditor,
  AdminEmptyState,
  AdminPillGroup,
  AdminSwitchField,
  AdminTextField,
} from "@/features/admin/components/admin-ui";
import type {
  CreateEmployeeFormState,
  EmployeeEditorState,
  EmployeeRoleOption,
} from "@/features/admin/hooks/use-admin-employees-screen";
import type {
  DayDraft,
  EmployeeAssignRole,
} from "@/features/admin/onboarding/types";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type EmployeeListItem = {
  _id: Id<"employees">;
  fullName: string;
  title?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  activeSalonCount: number;
  assignments: { salonName: string }[];
};

type SelectedAssignment = {
  role: EmployeeAssignRole;
} | null;

type SurfaceProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function EmployeeSurface({ title, subtitle, children }: SurfaceProps) {
  return (
    <View
      className="gap-4 rounded-3xl border border-neutral-200 bg-white p-4"
      style={{ borderCurve: "continuous" }}
    >
      <View className="gap-1">
        <Text selectable className="text-lg font-semibold text-neutral-950">
          {title}
        </Text>
        {subtitle ? (
          <Text selectable className="text-sm text-neutral-500">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text selectable className="text-sm text-neutral-600">
        {label}
      </Text>
      <Text
        selectable
        className="text-sm font-semibold text-neutral-900"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
    </View>
  );
}

export function EmployeesOverviewSection({
  employees,
}: {
  employees: EmployeeListItem[];
}) {
  return (
    <EmployeeSurface title="Overblik">
      <View>
        <MetricRow label="Medarbejdere" value={String(employees.length)} />
        <View className="h-px bg-neutral-200" />
        <MetricRow
          label="Aktive"
          value={String(employees.filter((item) => item.isActive).length)}
        />
        <View className="h-px bg-neutral-200" />
        <MetricRow
          label="Kontaktdata"
          value={String(
            employees.filter((item) => item.email || item.phone).length,
          )}
        />
        <View className="h-px bg-neutral-200" />
        <MetricRow
          label="Salonrelationer"
          value={String(
            employees.reduce(
              (sum, employee) => sum + employee.activeSalonCount,
              0,
            ),
          )}
        />
      </View>
    </EmployeeSurface>
  );
}

export function EmployeesListSection({
  search,
  onSearch,
  filteredEmployees,
  selectedEmployeeId,
  onSelectEmployee,
}: {
  search: string;
  onSearch: (value: string) => void;
  filteredEmployees: EmployeeListItem[];
  selectedEmployeeId: Id<"employees"> | null;
  onSelectEmployee: (employeeId: Id<"employees">) => void;
}) {
  return (
    <EmployeeSurface
      title="Medarbejderliste"
      subtitle="Søg i teamet og vælg en profil"
    >
      <View className="gap-3">
        <AdminTextField
          label="Søg"
          value={search}
          onChangeText={onSearch}
          placeholder="Navn, titel, salon eller kontaktdata"
        />
        {filteredEmployees.length === 0 ? (
          <AdminEmptyState
            title="Ingen medarbejdere matcher"
            description="Brugere med rollen 'medarbejder' vises automatisk her."
          />
        ) : (
          filteredEmployees.map((employee) => {
            const isSelected = selectedEmployeeId === employee._id;
            return (
              <Pressable
                key={employee._id}
                onPress={() => onSelectEmployee(employee._id)}
                className={`rounded-2xl border px-3 py-3 ${
                  isSelected
                    ? "border-neutral-900 bg-neutral-100"
                    : "border-neutral-200 bg-white"
                }`}
                style={{ borderCurve: "continuous" }}
              >
                <Text
                  selectable
                  className="text-sm font-semibold text-neutral-900"
                >
                  {employee.fullName}
                </Text>
                <Text selectable className="mt-1 text-xs text-neutral-500">
                  {[
                    employee.title,
                    employee.email,
                    employee.phone,
                    employee.assignments
                      .map((assignment) => assignment.salonName)
                      .join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Ingen ekstra oplysninger endnu"}
                </Text>
                <Text selectable className="mt-2 text-xs text-neutral-600">
                  {employee.isActive ? "Aktiv" : "Inaktiv"}
                </Text>
                <Text
                  selectable
                  className="mt-2 text-xs font-semibold text-neutral-700"
                >
                  Vælg
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    </EmployeeSurface>
  );
}

export function CreateEmployeeAccountSection({
  form,
  onFormChange,
  isCreating,
  latestCreatedCredentials,
  onCreate,
}: {
  form: CreateEmployeeFormState;
  onFormChange: (patch: Partial<CreateEmployeeFormState>) => void;
  isCreating: boolean;
  latestCreatedCredentials: { email: string; temporaryPin: string } | null;
  onCreate: () => void;
}) {
  return (
    <EmployeeSurface
      title="Opret medarbejder-login"
      subtitle="Der oprettes Better Auth-konto med rollen medarbejder og midlertidig PIN."
    >
      <View className="gap-3">
        <AdminTextField
          label="Fulde navn"
          value={form.fullName}
          onChangeText={(value) => onFormChange({ fullName: value })}
          placeholder="Emma Jensen"
          autoCapitalize="words"
        />
        <AdminTextField
          label="Email"
          value={form.email}
          onChangeText={(value) => onFormChange({ email: value })}
          placeholder="emma@cutandgo.dk"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AdminTextField
          label="Telefon (valgfri)"
          value={form.phone}
          onChangeText={(value) => onFormChange({ phone: value })}
          placeholder="+45 12 34 56 78"
          keyboardType="phone-pad"
        />
        <AdminButton
          title={isCreating ? "Opretter..." : "Opret medarbejder"}
          onPress={onCreate}
          disabled={isCreating}
        />

        {latestCreatedCredentials ? (
          <View
            className="gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-3"
            style={{ borderCurve: "continuous" }}
          >
            <Text selectable className="text-xs font-semibold text-emerald-800">
              Medarbejder-login oprettet
            </Text>
            <Text selectable className="text-xs text-emerald-900">
              Email: {latestCreatedCredentials.email}
            </Text>
            <Text selectable className="text-xs text-emerald-900">
              Midlertidig PIN: {latestCreatedCredentials.temporaryPin}
            </Text>
            <Text selectable className="text-xs text-emerald-700">
              Medarbejderen skal vælge ny adgangskode ved første login.
            </Text>
          </View>
        ) : null}
      </View>
    </EmployeeSurface>
  );
}

export function EmployeeProfileSection({
  width,
  selectedEmployeeName,
  editor,
  onEditorChange,
  isUploadingAvatar,
  hasSelection,
  onPickAvatar,
}: {
  width: number;
  selectedEmployeeName: string | null;
  editor: EmployeeEditorState;
  onEditorChange: (patch: Partial<EmployeeEditorState>) => void;
  isUploadingAvatar: boolean;
  hasSelection: boolean;
  onPickAvatar: () => void;
}) {
  return (
    <EmployeeSurface
      title={
        selectedEmployeeName
          ? `Redigér ${selectedEmployeeName}`
          : "Redigér medarbejder"
      }
      subtitle="Stamdata for den valgte profil"
    >
      <View className="gap-3">
        <View className="items-start gap-2">
          <Text selectable className="text-xs font-semibold text-neutral-600">
            Profilbillede
          </Text>
          <View
            className="h-20 w-20 overflow-hidden rounded-full bg-neutral-200"
            style={{ borderCurve: "continuous" }}
          >
            {editor.avatarPreviewUrl ? (
              <Image
                source={editor.avatarPreviewUrl}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Text selectable className="text-xs text-neutral-500">
                  Ingen
                </Text>
              </View>
            )}
          </View>
          <AdminButton
            title={isUploadingAvatar ? "Uploader..." : "Vælg billede"}
            variant="secondary"
            onPress={onPickAvatar}
            disabled={isUploadingAvatar || !hasSelection}
          />
        </View>

        <AdminTextField
          label="Fulde navn"
          value={editor.fullName}
          onChangeText={(value) => onEditorChange({ fullName: value })}
          placeholder="Emma Jensen"
          autoCapitalize="words"
        />
        <View className={`gap-3 ${width < 640 ? "" : "flex-row"}`}>
          <View className="flex-1">
            <AdminTextField
              label="Email"
              value={editor.email}
              onChangeText={(value) => onEditorChange({ email: value })}
              placeholder="emma@cutandgo.dk"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View className="flex-1">
            <AdminTextField
              label="Telefon"
              value={editor.phone}
              onChangeText={(value) => onEditorChange({ phone: value })}
              placeholder="+45 12 34 56 78"
              keyboardType="phone-pad"
            />
          </View>
        </View>
        <AdminTextField
          label="Titel"
          value={editor.title}
          onChangeText={(value) => onEditorChange({ title: value })}
          placeholder="Senior stylist"
        />
        <AdminTextField
          label="Bio"
          value={editor.bio}
          onChangeText={(value) => onEditorChange({ bio: value })}
          placeholder="Kort intern note eller faglig profil"
          multiline
        />
        <AdminSwitchField
          label="Aktiv profil"
          description="Slå fra, hvis medarbejderen ikke længere skal være aktiv i admin."
          value={editor.isActive}
          onValueChange={(value) => onEditorChange({ isActive: value })}
        />
      </View>
    </EmployeeSurface>
  );
}

export function EmployeeAssignmentSection({
  salons,
  selectedSalonId,
  onSelectSalon,
  selectedRole,
  onSelectRole,
  roleOptions,
  selectedAssignment,
  week,
  onWeekChange,
  isSaving,
  onSave,
}: {
  salons: { _id: Id<"salons">; name: string }[];
  selectedSalonId: Id<"salons"> | null;
  onSelectSalon: (salonId: Id<"salons">) => void;
  selectedRole: EmployeeAssignRole;
  onSelectRole: (role: EmployeeAssignRole) => void;
  roleOptions: EmployeeRoleOption[];
  selectedAssignment: SelectedAssignment;
  week: DayDraft[];
  onWeekChange: (rows: DayDraft[]) => void;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <EmployeeSurface
      title="Salon, rolle og arbejdstider"
      subtitle="Tilknytning og ugeplan for den valgte medarbejder"
    >
      {salons.length === 0 ? (
        <AdminEmptyState
          title="Ingen saloner endnu"
          description="Opret en salon først, før medarbejdere kan tildeles roller og ugeplan."
          actionHref="/(settings)/admin"
          actionLabel="Opret salon"
        />
      ) : (
        <View className="gap-4">
          <View className="gap-2">
            <Text
              selectable
              className="text-xs font-semibold uppercase tracking-[2px] text-neutral-500"
            >
              Salon
            </Text>
            <AdminPillGroup
              options={salons.map((salon) => ({
                label: salon.name,
                value: salon._id,
              }))}
              selected={selectedSalonId ?? salons[0]._id}
              onSelect={onSelectSalon}
            />
          </View>

          <View className="gap-2">
            <Text
              selectable
              className="text-xs font-semibold uppercase tracking-[2px] text-neutral-500"
            >
              Rolle
            </Text>
            <AdminPillGroup
              options={roleOptions}
              selected={selectedRole}
              onSelect={onSelectRole}
            />
          </View>

          <View
            className={`rounded-2xl border px-3 py-2 ${
              selectedAssignment
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
            style={{ borderCurve: "continuous" }}
          >
            <Text
              selectable
              className={`text-xs font-semibold ${
                selectedAssignment ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              {selectedAssignment
                ? `Eksisterende tilknytning · rolle: ${selectedAssignment.role}`
                : "Ny tilknytning gemmes ved næste save"}
            </Text>
          </View>

          <AdminDayScheduleEditor rows={week} onChange={onWeekChange} />

          <AdminButton
            title={isSaving ? "Gemmer..." : "Gem medarbejder"}
            disabled={isSaving}
            onPress={onSave}
          />
        </View>
      )}
    </EmployeeSurface>
  );
}
