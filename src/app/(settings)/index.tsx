import { ScrollView, Text, View } from "react-native";

export default function SettingsScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <View
        style={{
          borderRadius: 16,
          borderCurve: "continuous",
          padding: 16,
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)",
          gap: 8,
        }}
      >
        <Text selectable style={{ fontSize: 22, fontWeight: "700" }}>
          Indstillinger
        </Text>
        <Text
          selectable
          style={{ fontSize: 16, color: "#374151", lineHeight: 22 }}
        >
          Tilpas appens opsætning, præferencer og notifikationer her.
        </Text>
      </View>
    </ScrollView>
  );
}
