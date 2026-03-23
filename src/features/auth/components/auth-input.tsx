import { useState } from "react";
import { Text, TextInput, type TextInputProps, View } from "react-native";

type AuthInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: TextInputProps["secureTextEntry"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  keyboardType?: TextInputProps["keyboardType"];
  textContentType?: TextInputProps["textContentType"];
  autoComplete?: TextInputProps["autoComplete"];
};

export function AuthInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  autoCapitalize = "none",
  keyboardType = "default",
  textContentType,
  autoComplete,
}: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="gap-1.5">
      <Text
        selectable
        className="text-xs font-semibold uppercase text-neutral-500"
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        textContentType={textContentType}
        autoComplete={autoComplete}
        autoCorrect={false}
        spellCheck={false}
        clearButtonMode="while-editing"
        className={`rounded-2xl border p-4 text-neutral-900 ${
          isFocused
            ? "border-neutral-900 bg-white"
            : "border-neutral-200 bg-neutral-50"
        }`}
        style={{ borderCurve: "continuous" }}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}
