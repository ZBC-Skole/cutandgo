import { AuthInput } from "@/features/auth/components/auth-input";
import { authClient } from "@/lib/auth-client";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type AuthMode = "signIn" | "signUp";

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modeTitle = useMemo(
    () => (mode === "signIn" ? "Log ind" : "Opret konto"),
    [mode],
  );

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const validationMessage = useMemo(() => {
    if (!normalizedEmail) {
      return "Indtast din email.";
    }

    if (!password) {
      return "Indtast din adgangskode.";
    }

    if (mode === "signUp") {
      if (!name.trim()) {
        return "Indtast dit navn.";
      }

      if (password.length < 8) {
        return "Adgangskoden skal være mindst 8 tegn.";
      }

      if (!confirmPassword) {
        return "Bekræft din adgangskode.";
      }

      if (password !== confirmPassword) {
        return "Adgangskoderne matcher ikke.";
      }
    }

    return null;
  }, [confirmPassword, mode, name, normalizedEmail, password]);

  const canSubmit = !isLoading && validationMessage === null;

  async function handleSubmit() {
    if (!canSubmit) {
      setErrorMessage(
        validationMessage ?? "Udfyld alle felter før du fortsætter.",
      );
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      if (mode === "signIn") {
        const result = await authClient.signIn.email({
          email: normalizedEmail,
          password,
        });

        if (result.error) {
          setErrorMessage(result.error.message ?? "Login fejlede.");
        }
        return;
      }

      const result = await authClient.signUp.email({
        email: normalizedEmail,
        password,
        name: name.trim(),
      });

      if (result.error) {
        setErrorMessage(result.error.message ?? "Kunne ikke oprette konto.");
      }
    } catch {
      setErrorMessage("Noget gik galt. Prøv igen om lidt.");
    } finally {
      setIsLoading(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrorMessage(null);
    setPassword("");
    setConfirmPassword("");
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
            {modeTitle}
          </Text>
          <Text selectable className="text-sm leading-5 text-neutral-600">
            {mode === "signIn"
              ? "Log ind for at fortsætte til Cut&Go."
              : "Opret en konto og kom i gang med booking."}
          </Text>
        </View>

        <View className="rounded-2xl border border-neutral-200 bg-neutral-100 p-1">
          <View className="flex-row gap-1.5">
            <Pressable
              accessibilityRole="button"
              onPress={() => switchMode("signIn")}
              className={`flex-1 rounded-xl px-3 py-2.5 ${
                mode === "signIn" ? "bg-white" : "bg-transparent"
              }`}
              style={{ borderCurve: "continuous" }}
            >
              <Text
                selectable
                className={`text-center text-sm font-semibold ${
                  mode === "signIn" ? "text-neutral-900" : "text-neutral-500"
                }`}
              >
                Log ind
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => switchMode("signUp")}
              className={`flex-1 rounded-xl px-3 py-2.5 ${
                mode === "signUp" ? "bg-white" : "bg-transparent"
              }`}
              style={{ borderCurve: "continuous" }}
            >
              <Text
                selectable
                className={`text-center text-sm font-semibold ${
                  mode === "signUp" ? "text-neutral-900" : "text-neutral-500"
                }`}
              >
                Opret konto
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="gap-3">
          {mode === "signUp" ? (
            <AuthInput
              label="Navn"
              placeholder="Dit navn"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              textContentType="name"
              autoComplete="name"
            />
          ) : null}

          <AuthInput
            label="Email"
            placeholder="din@email.dk"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />

          <AuthInput
            label="Adgangskode"
            placeholder="Min. 8 tegn"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType={mode === "signIn" ? "password" : "newPassword"}
            autoComplete={
              mode === "signIn" ? "current-password" : "new-password"
            }
          />

          {mode === "signUp" ? (
            <AuthInput
              label="Bekræft adgangskode"
              placeholder="Skriv den igen"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
            />
          ) : null}
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
            {isLoading
              ? "Arbejder..."
              : mode === "signIn"
                ? "Log ind"
                : "Opret konto"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
