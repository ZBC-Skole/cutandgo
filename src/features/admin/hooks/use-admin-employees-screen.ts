import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { createDefaultWeek } from "@/features/admin/onboarding/lib";
import type {
  DayDraft,
  EmployeeAssignRole,
} from "@/features/admin/onboarding/types";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

export type SelectedEmployee = Id<"employees"> | null;

export type EmployeeEditorState = {
  fullName: string;
  email: string;
  phone: string;
  title: string;
  bio: string;
  avatarStorageId: Id<"_storage"> | null;
  avatarPreviewUrl: string | null;
  isActive: boolean;
};

export type EmployeeRoleOption = { label: string; value: EmployeeAssignRole };
export type CreateEmployeeFormState = {
  fullName: string;
  email: string;
  phone: string;
};

export const ROLE_OPTIONS: EmployeeRoleOption[] = [
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

const EMPTY_CREATE_FORM: CreateEmployeeFormState = {
  fullName: "",
  email: "",
  phone: "",
};

function sanitizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function useAdminEmployeesScreen() {
  const employees = useQuery(
    api.backend.domains.staff.index.listEmployeesWithAssignments,
  );
  const salons = useQuery(api.backend.domains.salons.index.listActive);

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
  const [createForm, setCreateForm] =
    useState<CreateEmployeeFormState>(EMPTY_CREATE_FORM);
  const [isCreatingEmployee, setIsCreatingEmployee] = useState(false);
  const [latestCreatedCredentials, setLatestCreatedCredentials] = useState<{
    email: string;
    temporaryPin: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const createEmployee = useMutation(
    api.backend.domains.staff.index.createEmployee,
  );
  const updateEmployee = useMutation(
    api.backend.domains.staff.index.updateEmployee,
  );
  const assignEmployee = useMutation(
    api.backend.domains.staff.index.assignEmployeeToSalon,
  );
  const setWorkingHours = useMutation(
    api.backend.domains.staff.index.setWorkingHours,
  );
  const createUploadUrl = useMutation(
    api.backend.domains.media.index.createUploadUrl,
  );
  const syncEmployeesFromWorkerRoles = useMutation(
    api.backend.domains.staff.index.syncEmployeesFromWorkerRolesAdmin,
  );

  const detail = useQuery(
    api.backend.domains.staff.index.getEmployeeAdminDetail,
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

  async function handleCreateEmployeeAccount() {
    if (!createForm.fullName.trim()) {
      Alert.alert("Manglende navn", "Udfyld medarbejderens navn først.");
      return;
    }
    if (!createForm.email.trim()) {
      Alert.alert("Manglende email", "Udfyld medarbejderens email først.");
      return;
    }

    try {
      setIsCreatingEmployee(true);
      const result = await createEmployee({
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: sanitizeOptional(createForm.phone),
      });

      setSelectedEmployeeId(result.employeeId);
      setCreateForm(EMPTY_CREATE_FORM);
      setLatestCreatedCredentials({
        email: result.email,
        temporaryPin: result.temporaryPin,
      });
      Alert.alert(
        "Medarbejder oprettet",
        "Login er oprettet med midlertidig PIN. Del oplysningerne sikkert.",
      );
    } catch (error) {
      Alert.alert("Kunne ikke oprette medarbejder", String(error));
    } finally {
      setIsCreatingEmployee(false);
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

  const selectedEmployee = employees?.find(
    (employee) => employee._id === selectedEmployeeId,
  );

  return {
    employees,
    salons,
    search,
    setSearch,
    filteredEmployees,
    selectedEmployeeId,
    setSelectedEmployeeId,
    selectedSalonId,
    setSelectedSalonId,
    selectedRole,
    setSelectedRole,
    week,
    setWeek,
    editor,
    setEditor,
    createForm,
    setCreateForm,
    isCreatingEmployee,
    latestCreatedCredentials,
    isSaving,
    isUploadingAvatar,
    selectedAssignment,
    selectedEmployee,
    handleCreateEmployeeAccount,
    handleSave,
    handlePickAvatar,
  };
}

export type AdminEmployeesScreenState = ReturnType<
  typeof useAdminEmployeesScreen
>;
