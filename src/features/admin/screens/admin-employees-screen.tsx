import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import LoadingView from "@/components/ui/loading-view";
import {
  AdminBadge,
  AdminButton,
  AdminDayScheduleEditor,
  AdminEmptyState,
  AdminHero,
  AdminListItem,
  AdminPillGroup,
  AdminSection,
  AdminShortcutCard,
  AdminStatCard,
  AdminSwitchField,
  AdminTextField,
} from "@/features/admin/components/admin-ui";
import { createDefaultWeek } from "@/features/admin/onboarding/lib";
import type {
  DayDraft,
  EmployeeAssignRole,
} from "@/features/admin/onboarding/types";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type SelectedEmployee = Id<"employees"> | "new" | null;
type EmployeeEditorState = {
  fullName: string;
  email: string;
  phone: string;
  title: string;
  bio: string;
  isActive: boolean;
};

const ROLE_OPTIONS: { label: string; value: EmployeeAssignRole }[] = [
  { label: "Owner", value: "owner" },
  { label: "Manager", value: "manager" },
  { label: "Stylist", value: "stylist" },
  { label: "Assistant", value: "assistant" },
];

const EMPTY_EDITOR: EmployeeEditorState = {
  fullName: "",
  email: "",
  phone: "",
  title: "",
  bio: "",
  isActive: true,
};

function sanitizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function AdminEmployeesScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 980;
  const employees = useQuery(api.staff.listEmployeesWithAssignments);
  const salons = useQuery(api.salons.listActive);
  const [search, setSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState<SelectedEmployee>(null);
  const [selectedSalonId, setSelectedSalonId] = useState<Id<"salons"> | null>(
    null,
  );
  const [selectedRole, setSelectedRole] =
    useState<EmployeeAssignRole>("stylist");
  const [week, setWeek] = useState<DayDraft[]>(createDefaultWeek());
  const [editor, setEditor] = useState<EmployeeEditorState>(EMPTY_EDITOR);
  const [isSaving, setIsSaving] = useState(false);

  const createEmployee = useMutation(api.staff.createEmployee);
  const updateEmployee = useMutation(api.staff.updateEmployee);
  const assignEmployee = useMutation(api.staff.assignEmployeeToSalon);
  const setWorkingHours = useMutation(api.staff.setWorkingHours);

  const detail = useQuery(
    api.staff.getEmployeeAdminDetail,
    selectedEmployeeId && selectedEmployeeId !== "new"
      ? { employeeId: selectedEmployeeId }
      : "skip",
  );

  useEffect(() => {
    if (!employees) {
      return;
    }

    if (!selectedEmployeeId) {
      setSelectedEmployeeId(employees[0]?._id ?? "new");
    }
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (!salons || salons.length === 0) {
      setSelectedSalonId(null);
      return;
    }

    setSelectedSalonId((current) =>
      current && salons.some((salon) => salon._id === current)
        ? current
        : salons[0]._id,
    );
  }, [salons]);

  useEffect(() => {
    if (selectedEmployeeId === "new") {
      setEditor(EMPTY_EDITOR);
      setSelectedRole("stylist");
      setWeek(createDefaultWeek());
      return;
    }

    if (!detail) {
      return;
    }

    setEditor({
      fullName: detail.employee.fullName,
      email: detail.employee.email ?? "",
      phone: detail.employee.phone ?? "",
      title: detail.employee.title ?? "",
      bio: detail.employee.bio ?? "",
      isActive: detail.employee.isActive,
    });

    const fallbackSalonId =
      detail.assignments[0]?.salonId ?? salons?.[0]?._id ?? null;
    setSelectedSalonId((current) => current ?? fallbackSalonId);
  }, [detail, salons, selectedEmployeeId]);

  useEffect(() => {
    if (selectedEmployeeId === "new") {
      setWeek(createDefaultWeek());
      setSelectedRole("stylist");
      return;
    }

    if (!detail || !selectedSalonId) {
      return;
    }

    const assignment = detail.assignments.find(
      (item) => item.salonId === selectedSalonId,
    );

    setSelectedRole(assignment?.role ?? "stylist");
    setWeek(
      assignment
        ? createDefaultWeek().map((row) => {
            const found = assignment.workingHours.find(
              (item) => item.weekday === row.weekday,
            );
            if (!found) {
              return row;
            }
            return {
              weekday: row.weekday,
              opensAt: found.startAt,
              closesAt: found.endAt,
              isClosed: found.isOff,
            };
          })
        : createDefaultWeek(),
    );
  }, [detail, selectedEmployeeId, selectedSalonId]);

  const filteredEmployees = useMemo(() => {
    const items = employees ?? [];
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((employee) => {
      const haystack = [
        employee.fullName,
        employee.title,
        employee.email,
        employee.phone,
        employee.assignments.map((item) => item.salonName).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [employees, search]);

  if (!employees || !salons) {
    return <LoadingView />;
  }

  async function handleSave() {
    if (!editor.fullName.trim()) {
      Alert.alert("Manglende navn", "Udfyld medarbejderens navn først.");
      return;
    }

    try {
      setIsSaving(true);

      let employeeId: Id<"employees">;
      if (!selectedEmployeeId || selectedEmployeeId === "new") {
        employeeId = await createEmployee({
          fullName: editor.fullName.trim(),
          email: sanitizeOptional(editor.email),
          phone: sanitizeOptional(editor.phone),
          title: sanitizeOptional(editor.title),
          bio: sanitizeOptional(editor.bio),
        });

        if (!editor.isActive) {
          await updateEmployee({
            employeeId,
            fullName: editor.fullName.trim(),
            email: sanitizeOptional(editor.email),
            phone: sanitizeOptional(editor.phone),
            title: sanitizeOptional(editor.title),
            bio: sanitizeOptional(editor.bio),
            isActive: false,
          });
        }
      } else {
        employeeId = selectedEmployeeId;
        await updateEmployee({
          employeeId,
          fullName: editor.fullName.trim(),
          email: sanitizeOptional(editor.email),
          phone: sanitizeOptional(editor.phone),
          title: sanitizeOptional(editor.title),
          bio: sanitizeOptional(editor.bio),
          isActive: editor.isActive,
        });
      }

      if (selectedSalonId) {
        await assignEmployee({
          employeeId,
          salonId: selectedSalonId,
          role: selectedRole,
        });
        await setWorkingHours({
          employeeId,
          salonId: selectedSalonId,
          entries: week.map((row) => ({
            weekday: row.weekday,
            startAt: row.opensAt,
            endAt: row.closesAt,
            isOff: row.isClosed,
          })),
        });
      }

      setSelectedEmployeeId(employeeId);
      Alert.alert(
        "Medarbejder gemt",
        "Profil, rolle og arbejdstider er opdateret.",
      );
    } catch (error) {
      Alert.alert("Kunne ikke gemme medarbejder", String(error));
    } finally {
      setIsSaving(false);
    }
  }

  const selectedAssignment = detail?.assignments.find(
    (item) => item.salonId === selectedSalonId,
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-stone-100"
      contentContainerClassName="mx-auto w-full max-w-7xl gap-5 p-4 pb-16"
    >
      <AdminHero
        eyebrow="Medarbejder"
        title="Teamadministration samlet ét sted"
        description="Vælg en medarbejder, redigér stamdata og bind personen til en salon med rolle og ugentlig arbejdstid uden at skifte route."
      >
        <View className={`gap-3 ${isCompact ? "" : "flex-row"}`}>
          <AdminShortcutCard
            href="/admin"
            title="Til statistik"
            description="Hop tilbage til driftsdashboardet med KPI’er, omsætning og salonsnapshot."
            cta="Åbn statistik"
          />
          <AdminShortcutCard
            href="/(settings)/admin"
            title="Ny salon"
            description="Hvis teamet skal udvides til en ny lokation, oprettes salonen i indstillinger."
            cta="Åbn indstillinger"
          />
        </View>
      </AdminHero>

      <View className={`gap-3 ${isCompact ? "" : "flex-row flex-wrap"}`}>
        <AdminStatCard
          label="Medarbejdere"
          value={String(employees.length)}
          tone="dark"
          helper="Profiler i systemet"
        />
        <AdminStatCard
          label="Aktive"
          value={String(employees.filter((item) => item.isActive).length)}
          tone="neutral"
          helper="Profiler med aktiv status"
        />
        <AdminStatCard
          label="Kontaktdata"
          value={String(
            employees.filter((item) => item.email || item.phone).length,
          )}
          tone="warm"
          helper="Har email eller telefon"
        />
        <AdminStatCard
          label="Salonrelationer"
          value={String(
            employees.reduce(
              (sum, employee) => sum + employee.activeSalonCount,
              0,
            ),
          )}
          tone="neutral"
          helper="Aktive medarbejder-salon koblinger"
        />
      </View>

      <View className={`gap-5 ${isCompact ? "" : "flex-row items-start"}`}>
        <View className={isCompact ? "gap-5" : "w-[320px] gap-5"}>
          <AdminSection
            eyebrow="Liste"
            title="Medarbejdere"
            description="Søg i teamet eller start en ny profil direkte herfra."
          >
            <View className="gap-3">
              <AdminTextField
                label="Søg"
                value={search}
                onChangeText={setSearch}
                placeholder="Navn, titel, salon eller kontaktdata"
              />
              <AdminButton
                title="Ny medarbejder"
                variant="secondary"
                onPress={() => setSelectedEmployeeId("new")}
              />
              {filteredEmployees.length === 0 ? (
                <AdminEmptyState
                  title="Ingen medarbejdere matcher"
                  description="Prøv en anden søgning eller opret en ny profil."
                />
              ) : (
                filteredEmployees.map((employee) => (
                  <AdminListItem
                    key={employee._id}
                    title={employee.fullName}
                    subtitle={
                      [
                        employee.title,
                        employee.email,
                        employee.phone,
                        employee.assignments
                          .map((assignment) => assignment.salonName)
                          .join(", "),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Ingen ekstra oplysninger endnu"
                    }
                    meta={employee.isActive ? "Aktiv" : "Inaktiv"}
                    selected={selectedEmployeeId === employee._id}
                    onPress={() => setSelectedEmployeeId(employee._id)}
                    footer={
                      employee.assignments.length > 0 ? (
                        <View className="flex-row flex-wrap gap-2">
                          {employee.assignments.map((assignment) => (
                            <AdminBadge
                              key={assignment._id}
                              label={`${assignment.salonName} · ${assignment.role}`}
                              tone={assignment.isActive ? "neutral" : "warning"}
                            />
                          ))}
                        </View>
                      ) : undefined
                    }
                  />
                ))
              )}
            </View>
          </AdminSection>
        </View>

        <View className="flex-1 gap-5">
          <AdminSection
            eyebrow="Profil"
            title={
              selectedEmployeeId === "new"
                ? "Opret medarbejder"
                : "Redigér medarbejder"
            }
            description="Stamdata gemmes her. Salonrolle og arbejdstid styres i sektionen nedenunder."
          >
            <View className="gap-3">
              <AdminTextField
                label="Fulde navn"
                value={editor.fullName}
                onChangeText={(value) =>
                  setEditor((current) => ({ ...current, fullName: value }))
                }
                placeholder="Emma Jensen"
                autoCapitalize="words"
              />
              <View className={`gap-3 ${width < 640 ? "" : "flex-row"}`}>
                <View className="flex-1">
                  <AdminTextField
                    label="Email"
                    value={editor.email}
                    onChangeText={(value) =>
                      setEditor((current) => ({ ...current, email: value }))
                    }
                    placeholder="emma@cutandgo.dk"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View className="flex-1">
                  <AdminTextField
                    label="Telefon"
                    value={editor.phone}
                    onChangeText={(value) =>
                      setEditor((current) => ({ ...current, phone: value }))
                    }
                    placeholder="+45 12 34 56 78"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
              <AdminTextField
                label="Titel"
                value={editor.title}
                onChangeText={(value) =>
                  setEditor((current) => ({ ...current, title: value }))
                }
                placeholder="Senior stylist"
              />
              <AdminTextField
                label="Bio"
                value={editor.bio}
                onChangeText={(value) =>
                  setEditor((current) => ({ ...current, bio: value }))
                }
                placeholder="Kort intern note eller faglig profil"
                multiline
              />
              <AdminSwitchField
                label="Aktiv profil"
                description="Slå fra, hvis medarbejderen ikke længere skal være aktiv i admin."
                value={editor.isActive}
                onValueChange={(value) =>
                  setEditor((current) => ({ ...current, isActive: value }))
                }
              />
            </View>
          </AdminSection>

          <AdminSection
            eyebrow="Tilknytning"
            title="Salon, rolle og arbejdstider"
            description="Vælg lokation og bestem, hvordan medarbejderen er sat op i den valgte salon."
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
                    onSelect={(value) => setSelectedSalonId(value)}
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
                    options={ROLE_OPTIONS}
                    selected={selectedRole}
                    onSelect={(value) => setSelectedRole(value)}
                  />
                </View>

                {selectedAssignment ? (
                  <View className="flex-row flex-wrap gap-2">
                    <AdminBadge
                      label="Eksisterende tilknytning"
                      tone="success"
                    />
                    <AdminBadge
                      label={`Rolle: ${selectedAssignment.role}`}
                      tone="neutral"
                    />
                  </View>
                ) : (
                  <AdminBadge
                    label="Ny salon-tilknytning gemmes ved næste save"
                    tone="warning"
                  />
                )}

                <AdminDayScheduleEditor rows={week} onChange={setWeek} />

                <AdminButton
                  title={isSaving ? "Gemmer..." : "Gem medarbejder"}
                  disabled={isSaving}
                  onPress={handleSave}
                />
              </View>
            )}
          </AdminSection>
        </View>
      </View>
    </ScrollView>
  );
}
