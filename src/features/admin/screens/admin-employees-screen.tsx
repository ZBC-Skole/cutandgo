import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import LoadingView from "@/components/ui/loading-view";
import {
  AdminButton,
  AdminDayScheduleEditor,
  AdminEmptyState,
  AdminPillGroup,
  AdminSwitchField,
  AdminTextField,
} from "@/features/admin/components/admin-ui";
import { createDefaultWeek } from "@/features/admin/onboarding/lib";
import type {
  DayDraft,
  EmployeeAssignRole,
} from "@/features/admin/onboarding/types";
import { Link } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type SelectedEmployee = Id<"employees"> | null;
type EmployeeEditorState = {
  fullName: string;
  email: string;
  phone: string;
  title: string;
  bio: string;
  avatarStorageId: Id<"_storage"> | null;
  avatarPreviewUrl: string | null;
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
  avatarStorageId: null,
  avatarPreviewUrl: null,
  isActive: true,
};

function sanitizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function Surface({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const updateEmployee = useMutation(api.staff.updateEmployee);
  const assignEmployee = useMutation(api.staff.assignEmployeeToSalon);
  const setWorkingHours = useMutation(api.staff.setWorkingHours);
  const createUploadUrl = useMutation(api.media.createUploadUrl);
  const syncEmployeesFromWorkerRoles = useMutation(
    api.staff.syncEmployeesFromWorkerRolesAdmin,
  );

  const detail = useQuery(
    api.staff.getEmployeeAdminDetail,
    selectedEmployeeId ? { employeeId: selectedEmployeeId } : "skip",
  );

  useEffect(() => {
    void syncEmployeesFromWorkerRoles({});
  }, [syncEmployeesFromWorkerRoles]);

  useEffect(() => {
    if (!employees) {
      return;
    }

    if (!selectedEmployeeId) {
      setSelectedEmployeeId(employees[0]?._id ?? null);
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
    if (!selectedEmployeeId) {
      setEditor(EMPTY_EDITOR);
      setWeek(createDefaultWeek());
      setSelectedRole("stylist");
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
      avatarStorageId: detail.employee.avatarStorageId ?? null,
      avatarPreviewUrl: detail.employee.avatarUrl ?? null,
      isActive: detail.employee.isActive,
    });

    const fallbackSalonId =
      detail.assignments[0]?.salonId ?? salons?.[0]?._id ?? null;
    setSelectedSalonId((current) => current ?? fallbackSalonId);
  }, [detail, salons, selectedEmployeeId]);

  useEffect(() => {
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
    if (!selectedEmployeeId) {
      Alert.alert(
        "Ingen medarbejder valgt",
        "Vælg en medarbejder fra listen først.",
      );
      return;
    }

    try {
      setIsSaving(true);

      const employeeId = selectedEmployeeId;
      await updateEmployee({
        employeeId,
        fullName: editor.fullName.trim(),
        email: sanitizeOptional(editor.email),
        phone: sanitizeOptional(editor.phone),
        title: sanitizeOptional(editor.title),
        bio: sanitizeOptional(editor.bio),
        avatarStorageId: editor.avatarStorageId ?? undefined,
        isActive: editor.isActive,
      });

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

  async function handlePickAvatar() {
    if (!selectedEmployeeId) {
      Alert.alert(
        "Ingen medarbejder valgt",
        "Vælg en medarbejder før du uploader billede.",
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Tilladelse mangler",
        "Giv adgang til billeder for at uploade avatar.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled) {
      return;
    }

    const selectedPhotoUri = result.assets[0]?.uri;
    if (!selectedPhotoUri) {
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const uploadUrl = await createUploadUrl({});
      const fileResponse = await fetch(selectedPhotoUri);
      const blob = await fileResponse.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": blob.type || "image/jpeg",
        },
        body: blob,
      });
      if (!uploadResponse.ok) {
        throw new Error("Upload fejlede.");
      }

      const payload = (await uploadResponse.json()) as {
        storageId?: Id<"_storage">;
      };
      if (!payload.storageId) {
        throw new Error("Storage ID mangler efter upload.");
      }

      setEditor((current) => ({
        ...current,
        avatarStorageId: payload.storageId ?? null,
        avatarPreviewUrl: selectedPhotoUri,
      }));
    } catch (error) {
      Alert.alert("Kunne ikke uploade billede", String(error));
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  const selectedAssignment = detail?.assignments.find(
    (item) => item.salonId === selectedSalonId,
  );

  const selectedEmployee = employees.find(
    (employee) => employee._id === selectedEmployeeId,
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-[#f5f5f7]"
      contentContainerClassName="mx-auto w-full max-w-6xl gap-5 px-4 pb-20"
    >
      <View className="gap-2 pt-2">
        <Text
          selectable
          className="text-xs uppercase tracking-[2px] text-neutral-500"
        >
          Medarbejdere
        </Text>
        <Text selectable className="text-3xl font-semibold text-neutral-950">
          Teamstyring
        </Text>
        <Text selectable className="text-sm leading-6 text-neutral-600">
          Medarbejdere med rollen &quot;medarbejder&quot; dukker automatisk op
          her. Vælg en profil og tilknyt salon, rolle og arbejdstider.
        </Text>
      </View>

      <View className="flex-row flex-wrap items-center gap-2">
        <Link href="/admin" asChild>
          <Pressable
            className="rounded-full border border-neutral-300 bg-white px-4 py-2"
            style={{ borderCurve: "continuous" }}
          >
            <Text selectable className="text-sm font-semibold text-neutral-900">
              Statistik
            </Text>
          </Pressable>
        </Link>
        <Link href="/(settings)/admin" asChild>
          <Pressable
            className="rounded-full border border-neutral-300 bg-white px-4 py-2"
            style={{ borderCurve: "continuous" }}
          >
            <Text selectable className="text-sm font-semibold text-neutral-900">
              Opret salon
            </Text>
          </Pressable>
        </Link>
      </View>

      <Surface title="Overblik">
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
      </Surface>

      <View className={`gap-5 ${isCompact ? "" : "flex-row items-start"}`}>
        <View className={isCompact ? "gap-5" : "w-[320px] gap-5"}>
          <Surface
            title="Medarbejderliste"
            subtitle="Søg i teamet og vælg en profil"
          >
            <View className="gap-3">
              <AdminTextField
                label="Søg"
                value={search}
                onChangeText={setSearch}
                placeholder="Navn, titel, salon eller kontaktdata"
              />
              {filteredEmployees.length === 0 ? (
                <AdminEmptyState
                  title="Ingen medarbejdere matcher"
                  description="Brugere med rollen 'medarbejder' vises automatisk her."
                />
              ) : (
                filteredEmployees.map((employee, index) => {
                  const isSelected = selectedEmployeeId === employee._id;
                  return (
                    <Pressable
                      key={employee._id}
                      onPress={() => setSelectedEmployeeId(employee._id)}
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
                      <Text
                        selectable
                        className="mt-1 text-xs text-neutral-500"
                      >
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
                      <Text
                        selectable
                        className="mt-2 text-xs text-neutral-600"
                      >
                        {employee.isActive ? "Aktiv" : "Inaktiv"}
                      </Text>
                      {index < filteredEmployees.length - 1 ? null : null}
                    </Pressable>
                  );
                })
              )}
            </View>
          </Surface>
        </View>

        <View className="flex-1 gap-5">
          <Surface
            title={
              selectedEmployee
                ? `Redigér ${selectedEmployee.fullName}`
                : "Redigér medarbejder"
            }
            subtitle="Stamdata for den valgte profil"
          >
            <View className="gap-3">
              <View className="items-start gap-2">
                <Text
                  selectable
                  className="text-xs font-semibold text-neutral-600"
                >
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
                  onPress={handlePickAvatar}
                  disabled={isUploadingAvatar || !selectedEmployeeId}
                />
              </View>

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
          </Surface>

          <Surface
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

                <AdminDayScheduleEditor rows={week} onChange={setWeek} />

                <AdminButton
                  title={isSaving ? "Gemmer..." : "Gem medarbejder"}
                  disabled={isSaving}
                  onPress={handleSave}
                />
              </View>
            )}
          </Surface>
        </View>
      </View>
    </ScrollView>
  );
}
