import { api } from "@/convex/_generated/api";
import { AuthInput } from "@/features/auth/components/auth-input";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export function EmployeeFirstLoginPasswordScreen() {
  const completeFirstLogin = useMutation(
    api.backend.domains.users.index.completeMyEmployeeFirstLogin,
  );
  const [temporaryPin, setTemporaryPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationMessage = useMemo(() => {
    if (!temporaryPin.trim()) {
      return "Indtast din midlertidige PIN.";
    }
    if (temporaryPin.trim().length < 8) {
      return "Midlertidig PIN skal være 8 cifre.";
    }
    if (!newPassword) {
      return "Indtast en ny adgangskode.";
    }
    if (newPassword.length < 8) {
      return "Den nye adgangskode skal være mindst 8 tegn.";
    }
    if (!confirmPassword) {
      return "Bekræft den nye adgangskode.";
    }
    if (newPassword !== confirmPassword) {
      return "Adgangskoderne matcher ikke.";
    }
    return null;
  }, [confirmPassword, newPassword, temporaryPin]);

  const canSubmit = !isSubmitting && validationMessage === null;

  async function handleSubmit() {
    if (!canSubmit) {
      setErrorMessage(
        validationMessage ?? "Udfyld alle felter før du fortsætter.",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const result = await authClient.changePassword({
        currentPassword: temporaryPin.trim(),
        newPassword,
      });

      if (result.error) {
        setErrorMessage(
          result.error.message ?? "Kunne ikke ændre adgangskoden.",
        );
        return;
      }

      await completeFirstLogin({});
    } catch {
      setErrorMessage("Noget gik galt. Prøv igen om lidt.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-neutral-100"
      contentContainerClassName="mx-auto w-full max-w-md flex-1 justify-center px-5 py-10"
    >
      <View className="gap-5 rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
        <View className="gap-1.5">
          <Text
            selectable
            className="text-3xl font-bold tracking-tight text-neutral-900"
          >
            Vælg ny adgangskode
          </Text>
          <Text selectable className="text-sm leading-5 text-neutral-600">
            Du er logget ind med en midlertidig PIN. Vælg en personlig
            adgangskode for at fortsætte.
          </Text>
        </View>

        <View className="gap-3">
          <AuthInput
            label="Midlertidig PIN"
            placeholder="8 cifre"
            value={temporaryPin}
            onChangeText={setTemporaryPin}
            secureTextEntry
            keyboardType="number-pad"
            autoComplete="current-password"
            textContentType="password"
          />

          <AuthInput
            label="Ny adgangskode"
            placeholder="Min. 8 tegn"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
          />

          <AuthInput
            label="Bekræft ny adgangskode"
            placeholder="Skriv den igen"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
          />
        </View>

        {validationMessage && !errorMessage ? (
          <View className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <Text selectable className="text-sm text-neutral-600">
              {validationMessage}
            </Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View className="rounded-xl border border-red-200 bg-red-50 p-3">
            <Text selectable className="text-sm text-red-700">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={handleSubmit}
          className={`rounded-xl px-4 py-3 ${
            canSubmit ? "bg-neutral-900" : "bg-neutral-300"
          }`}
          style={{ borderCurve: "continuous" }}
        >
          <Text
            selectable
            className="text-center text-base font-semibold text-white"
          >
            {isSubmitting ? "Gemmer..." : "Gem ny adgangskode"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
