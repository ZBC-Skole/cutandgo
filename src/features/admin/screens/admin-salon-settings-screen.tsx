import {
  AdminButton,
  AdminDayScheduleEditor,
  AdminEmptyState,
  AdminListItem,
  AdminSection,
  AdminTextField,
} from "@/features/admin/components/admin-ui";
import { useAdminSalonSettingsScreen } from "@/features/admin/hooks/use-admin-salon-settings-screen";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

export function AdminSalonSettingsScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 900;
  const state = useAdminSalonSettingsScreen();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-neutral-100"
      contentContainerClassName="mx-auto w-full max-w-4xl gap-4 p-4 pb-16"
    >
      <View className="gap-1 pt-1">
        <Text
          selectable
          className="text-xs uppercase tracking-[2px] text-neutral-500"
        >
          Saloner
        </Text>
        <Text selectable className="text-2xl font-semibold text-neutral-950">
          Salon administration
        </Text>
      </View>

      <View
        className="flex-row rounded-2xl bg-white p-1"
        style={{ borderCurve: "continuous" }}
      >
        <Pressable
          onPress={() => state.setActiveTab("create")}
          className={`flex-1 rounded-xl px-3 py-2 ${
            state.activeTab === "create" ? "bg-neutral-900" : "bg-transparent"
          }`}
          style={{ borderCurve: "continuous" }}
        >
          <Text
            selectable
            className={`text-center text-sm font-semibold ${
              state.activeTab === "create" ? "text-white" : "text-neutral-700"
            }`}
          >
            Opret salon
          </Text>
        </Pressable>
        <Pressable
          onPress={() => state.setActiveTab("manage")}
          className={`flex-1 rounded-xl px-3 py-2 ${
            state.activeTab === "manage" ? "bg-neutral-900" : "bg-transparent"
          }`}
          style={{ borderCurve: "continuous" }}
        >
          <Text
            selectable
            className={`text-center text-sm font-semibold ${
              state.activeTab === "manage" ? "text-white" : "text-neutral-700"
            }`}
          >
            Saloner
          </Text>
        </Pressable>
      </View>

      {state.activeTab === "create" ? (
        <AdminSection
          title="Opret ny salon"
          description="Indtast stamdata og åbningstider i ét simpelt flow."
        >
          <View className={`gap-3 ${isCompact ? "" : "flex-row"}`}>
            <View className="flex-1 gap-3">
              <AdminTextField
                label="Salonnavn"
                value={state.form.name}
                onChangeText={state.updateSalonName}
                placeholder="Cut&Go Frederiksberg"
                autoCapitalize="words"
              />
              <AdminTextField
                label="Slug"
                value={state.form.slug}
                onChangeText={state.updateSalonSlug}
                placeholder="cutgo-frederiksberg"
                autoCapitalize="none"
              />
              <AdminTextField
                label="Søg adresse"
                value={state.form.addressQuery}
                onChangeText={(value) =>
                  state.patchForm({ addressQuery: value })
                }
                placeholder="Fx Falkoner Alle 21, Frederiksberg"
              />
              <View className={`gap-3 ${width < 640 ? "" : "flex-row"}`}>
                <View className="flex-1">
                  <AdminButton
                    title={
                      state.isSearchingAddress
                        ? "Søger adresse..."
                        : "Find adresse"
                    }
                    onPress={() => {
                      void state.handleSearchAddress();
                    }}
                    variant="secondary"
                    disabled={state.isSearchingAddress || state.isSubmitting}
                  />
                </View>
                <View className="flex-1">
                  <AdminButton
                    title={
                      state.isUsingCurrentLocation
                        ? "Henter lokation..."
                        : "Brug min lokation"
                    }
                    onPress={() => {
                      void state.handleUseCurrentLocation();
                    }}
                    variant="secondary"
                    disabled={
                      state.isUsingCurrentLocation || state.isSubmitting
                    }
                  />
                </View>
              </View>
            </View>

            <View className="flex-1 gap-3">
              <AdminTextField
                label="Adresse"
                value={state.form.addressLine1}
                onChangeText={(value) =>
                  state.patchForm({ addressLine1: value })
                }
                placeholder="Gadenavn og nummer"
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AdminTextField
                    label="Postnummer"
                    value={state.form.postalCode}
                    onChangeText={(value) =>
                      state.patchForm({ postalCode: value })
                    }
                    placeholder="2000"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <AdminTextField
                    label="By"
                    value={state.form.city}
                    onChangeText={(value) => state.patchForm({ city: value })}
                    placeholder="Frederiksberg"
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AdminTextField
                    label="Telefon"
                    value={state.form.phone}
                    onChangeText={(value) => state.patchForm({ phone: value })}
                    placeholder="+45 12 34 56 78"
                    keyboardType="phone-pad"
                  />
                </View>
                <View className="flex-1">
                  <AdminTextField
                    label="Email"
                    value={state.form.email}
                    onChangeText={(value) => state.patchForm({ email: value })}
                    placeholder="salon@cutandgo.dk"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <View
                className="gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3"
                style={{ borderCurve: "continuous" }}
              >
                <Text
                  selectable
                  className="text-xs font-semibold text-neutral-700"
                >
                  Lokation
                </Text>
                <Text selectable className="text-sm text-neutral-600">
                  {state.form.addressLine1 || "Ingen adresse valgt"}
                </Text>
                <Text selectable className="text-sm text-neutral-600">
                  {[state.form.postalCode, state.form.city]
                    .filter(Boolean)
                    .join(" ") || "By og postnummer mangler"}
                </Text>
                <Text selectable className="text-sm text-neutral-600">
                  {state.form.latitude && state.form.longitude
                    ? `${state.form.latitude}, ${state.form.longitude}`
                    : "Koordinater mangler"}
                </Text>
                {state.feedback ? (
                  <Text selectable className="text-xs text-neutral-700">
                    {state.feedback}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View className="gap-3">
            <Text selectable className="text-sm font-semibold text-neutral-950">
              Åbningstider
            </Text>
            <AdminDayScheduleEditor
              rows={state.openingWeek}
              onChange={state.setOpeningWeek}
            />
            <AdminButton
              title={state.isSubmitting ? "Opretter salon..." : "Opret salon"}
              onPress={() => {
                void state.handleCreateSalon();
              }}
              disabled={state.isSubmitting}
            />
          </View>
        </AdminSection>
      ) : (
        <AdminSection
          title="Eksisterende saloner"
          description="Vælg en salon og opdatér åbningstider."
        >
          <View className={`gap-4 ${isCompact ? "" : "flex-row"}`}>
            <View className="flex-1 gap-3">
              {state.salons.length === 0 ? (
                <AdminEmptyState
                  title="Ingen saloner endnu"
                  description="Opret din første salon under fanen 'Opret salon'."
                />
              ) : (
                state.salons.map((salon) => (
                  <AdminListItem
                    key={salon._id}
                    title={salon.name}
                    subtitle={`${salon.addressLine1}, ${salon.postalCode} ${salon.city}`}
                    meta={salon.slug}
                    selected={state.selectedExistingSalonId === salon._id}
                    onPress={() => {
                      state.setSelectedExistingSalonId(salon._id);
                      state.setExistingHoursFeedback(null);
                    }}
                  />
                ))
              )}
            </View>

            <View className="flex-1 gap-3">
              {state.selectedExistingSalonId ? (
                <>
                  <AdminDayScheduleEditor
                    rows={state.existingOpeningWeek}
                    onChange={state.setExistingOpeningWeek}
                  />
                  <AdminButton
                    title={
                      state.isSavingExistingHours
                        ? "Gemmer åbningstider..."
                        : "Gem åbningstider"
                    }
                    onPress={() => {
                      void state.handleSaveExistingOpeningHours();
                    }}
                    disabled={state.isSavingExistingHours}
                  />
                  {state.existingHoursFeedback ? (
                    <Text selectable className="text-sm text-neutral-700">
                      {state.existingHoursFeedback}
                    </Text>
                  ) : null}
                </>
              ) : (
                <AdminEmptyState
                  title="Vælg en salon"
                  description="Når en salon er valgt, kan åbningstider redigeres her."
                />
              )}
            </View>
          </View>
        </AdminSection>
      )}
    </ScrollView>
  );
}
