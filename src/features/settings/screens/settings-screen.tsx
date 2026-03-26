import { api } from "@/convex/_generated/api";
import { useRole } from "@/hooks/use-role";
import { authClient } from "@/lib/auth-client";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

type SessionShape = {
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  session?: {
    id?: string;
    expiresAt?: string;
    createdAt?: string;
  };
};

type SettingsRowProperties = {
  title: string;
  subtitle?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  destructive?: boolean;
};

function SettingsRow({
  title,
  subtitle,
  iconName,
  onPress,
  destructive = false,
}: SettingsRowProperties) {
  const content = (
    <View className="flex-row items-center gap-3">
      <View
        className={`h-10 w-10 items-center justify-center rounded-xl ${
          destructive ? "bg-red-50" : "bg-neutral-100"
        }`}
        style={{ borderCurve: "continuous" }}
      >
        <Ionicons
          name={iconName}
          size={18}
          color={destructive ? "#b91c1c" : "#374151"}
        />
      </View>

      <View className="flex-1 gap-0.5">
        <Text
          selectable
          className={`text-sm font-semibold ${
            destructive ? "text-red-700" : "text-neutral-900"
          }`}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text selectable className="text-xs text-neutral-500">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      ) : null}
    </View>
  );

  if (!onPress) {
    return <View className="rounded-xl px-2 py-2">{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="rounded-xl px-2 py-2"
      style={{ borderCurve: "continuous" }}
    >
      {content}
    </Pressable>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const sessionState = authClient.useSession();
  const role = useRole();
  const resetAdminOnboarding = useMutation(api.adminOnboarding.resetMy);
  const bootstrapFirstAdmin = useMutation(api.userRoles.bootstrapFirstAdmin);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false);
  const [isBootstrappingAdmin, setIsBootstrappingAdmin] = useState(false);

  const sessionData = useMemo(
    () => (sessionState.data as SessionShape | null) ?? null,
    [sessionState.data],
  );

  const displayName = sessionData?.user?.name?.trim() || "Cut&Go bruger";
  const displayEmail = sessionData?.user?.email?.trim() || "Ingen email fundet";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const legalBaseUrl =
    process.env.EXPO_PUBLIC_SITE_URL ?? "https://cutandgo.dk";

  async function openExternalUrl(url: string) {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Kunne ikke åbne link", "Prøv igen om et øjeblik.");
      return;
    }

    await Linking.openURL(url);
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    try {
      setIsSigningOut(true);
      const result = await authClient.signOut();

      if (result?.error) {
        Alert.alert(
          "Kunne ikke logge ud",
          result.error.message ?? "Prøv igen.",
        );
      }
    } catch {
      Alert.alert("Kunne ikke logge ud", "Prøv igen om et øjeblik.");
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleRestartOnboarding() {
    if (!role.isAdmin || isResettingOnboarding) {
      return;
    }

    try {
      setIsResettingOnboarding(true);
      await resetAdminOnboarding({});
      router.push("/admin");
    } catch {
      Alert.alert("Kunne ikke starte onboarding", "Prøv igen om et øjeblik.");
    } finally {
      setIsResettingOnboarding(false);
    }
  }

  async function handleBootstrapAdmin() {
    if (isBootstrappingAdmin) {
      return;
    }

    try {
      setIsBootstrappingAdmin(true);
      await bootstrapFirstAdmin({});
      Alert.alert("Admin aktiveret", "Din bruger er nu admin. Åbn appen igen.");
      router.replace("/(settings)");
    } catch (error) {
      Alert.alert("Kunne ikke aktivere admin", String(error));
    } finally {
      setIsBootstrappingAdmin(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-neutral-100"
      contentContainerClassName="mx-auto w-full max-w-4xl gap-4 p-4 pb-10"
    >
      <View
        className="gap-4 rounded-2xl bg-white p-4"
        style={{ borderCurve: "continuous" }}
      >
        <Text
          selectable
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          Konto
        </Text>

        <View className="flex-row items-center gap-3">
          <View
            className="h-12 w-12 items-center justify-center rounded-xl bg-neutral-900"
            style={{ borderCurve: "continuous" }}
          >
            <Text selectable className="text-sm font-bold text-white">
              {initials || "CG"}
            </Text>
          </View>

          <View className="flex-1 gap-0.5">
            <Text
              selectable
              className="text-base font-semibold text-neutral-900"
            >
              {displayName}
            </Text>
            <Text selectable className="text-sm text-neutral-500">
              {displayEmail}
            </Text>
          </View>

          <View
            className={`rounded-full px-3 py-1 ${
              role.isAdmin ? "bg-amber-100" : "bg-neutral-100"
            }`}
            style={{ borderCurve: "continuous" }}
          >
            <Text
              selectable
              className={`text-xs font-semibold uppercase tracking-wide ${
                role.isAdmin ? "text-amber-800" : "text-neutral-600"
              }`}
            >
              {role.primaryRole ?? "ingen rolle"}
            </Text>
          </View>
        </View>
      </View>

      <View
        className="gap-1 rounded-2xl bg-white p-2"
        style={{ borderCurve: "continuous" }}
      >
        {role.isAdmin ? (
          <>
            <Text
              selectable
              className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
            >
              Admin værktøjer
            </Text>
            <SettingsRow
              title="Saloner og åbningstider"
              subtitle="Opret salon og redigér åbningstider"
              iconName="business-outline"
              onPress={() => router.push("/(settings)/admin")}
            />
            <SettingsRow
              title="Medarbejdere"
              subtitle="Administrér ansatte og roller"
              iconName="people-outline"
              onPress={() => router.push("/employees")}
            />
            <SettingsRow
              title="Services"
              subtitle="Opret og slet services"
              iconName="cut-outline"
              onPress={() => router.push("/services")}
            />
            <SettingsRow
              title={
                isResettingOnboarding
                  ? "Starter onboarding..."
                  : "Kør onboarding igen"
              }
              subtitle="Genåbn setup-flowet for admin"
              iconName="refresh-outline"
              onPress={handleRestartOnboarding}
            />
          </>
        ) : (
          <>
            <Text
              selectable
              className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
            >
              Adgang
            </Text>
            <SettingsRow
              title={
                isBootstrappingAdmin ? "Aktiverer admin..." : "Aktivér admin"
              }
              subtitle="Virker kun når der ikke allerede findes en admin-bruger"
              iconName="shield-checkmark-outline"
              onPress={handleBootstrapAdmin}
            />
          </>
        )}
        <Text
          selectable
          className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          Legal
        </Text>
        <SettingsRow
          title="Privatlivspolitik"
          subtitle="Hvordan vi håndterer dine data"
          iconName="shield-checkmark-outline"
          onPress={() => openExternalUrl(`${legalBaseUrl}/privacy`)}
        />
        <SettingsRow
          title="Vilkår og betingelser"
          subtitle="Regler for brug af Cut&Go"
          iconName="document-text-outline"
          onPress={() => openExternalUrl(`${legalBaseUrl}/terms`)}
        />
        <SettingsRow
          title="Cookie-politik"
          subtitle="Information om cookies"
          iconName="globe-outline"
          onPress={() => openExternalUrl(`${legalBaseUrl}/cookies`)}
        />
      </View>

      <View
        className="gap-1 rounded-2xl bg-white p-2"
        style={{ borderCurve: "continuous" }}
      >
        <Text
          selectable
          className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          Konto handlinger
        </Text>

        <SettingsRow
          title={isSigningOut ? "Logger ud..." : "Log ud"}
          subtitle="Afslut din nuværende session"
          iconName="log-out-outline"
          destructive
          onPress={handleSignOut}
        />
      </View>

      <View
        className="gap-2 rounded-2xl bg-white p-4"
        style={{ borderCurve: "continuous" }}
      >
        <Text
          selectable
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          App
        </Text>
        <View className="flex-row items-center justify-between">
          <Text selectable className="text-sm text-neutral-600">
            Version
          </Text>
          <Text
            selectable
            className="text-sm font-semibold text-neutral-900"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {appVersion}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
