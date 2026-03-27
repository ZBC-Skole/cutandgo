import LoadingView from "@/components/ui/loading-view";
import {
  EmployeeAssignmentSection,
  EmployeeProfileSection,
  EmployeesListSection,
  EmployeesOverviewSection,
} from "@/features/admin/components/admin-employees-sections";
import {
  ROLE_OPTIONS,
  useAdminEmployeesScreen,
} from "@/features/admin/hooks/use-admin-employees-screen";
import { Link } from "expo-router";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

export function AdminEmployeesScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 980;
  const state = useAdminEmployeesScreen();

  if (!state.employees || !state.salons) {
    return <LoadingView />;
  }

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

      <EmployeesOverviewSection employees={state.employees} />

      <View className={`gap-5 ${isCompact ? "" : "flex-row items-start"}`}>
        <View className={isCompact ? "gap-5" : "w-[320px] gap-5"}>
          <EmployeesListSection
            search={state.search}
            onSearch={state.setSearch}
            filteredEmployees={state.filteredEmployees}
            selectedEmployeeId={state.selectedEmployeeId}
            onSelectEmployee={state.setSelectedEmployeeId}
          />
        </View>

        <View className="flex-1 gap-5">
          <EmployeeProfileSection
            width={width}
            selectedEmployeeName={state.selectedEmployee?.fullName ?? null}
            editor={state.editor}
            onEditorChange={(patch) =>
              state.setEditor((current) => ({
                ...current,
                ...patch,
              }))
            }
            isUploadingAvatar={state.isUploadingAvatar}
            hasSelection={Boolean(state.selectedEmployeeId)}
            onPickAvatar={() => {
              void state.handlePickAvatar();
            }}
          />

          <EmployeeAssignmentSection
            salons={state.salons}
            selectedSalonId={state.selectedSalonId}
            onSelectSalon={state.setSelectedSalonId}
            selectedRole={state.selectedRole}
            onSelectRole={state.setSelectedRole}
            roleOptions={ROLE_OPTIONS}
            selectedAssignment={state.selectedAssignment ?? null}
            week={state.week}
            onWeekChange={state.setWeek}
            isSaving={state.isSaving}
            onSave={() => {
              void state.handleSave();
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
}
