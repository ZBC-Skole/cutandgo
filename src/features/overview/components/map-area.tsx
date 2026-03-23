import { Text, View } from "react-native";

type MapAreaProperties = {
  mode: "placeholder" | "native";
  address: string;
  latitude?: number;
  longitude?: number;
};

export function MapArea({
  mode,
  address,
  latitude,
  longitude,
}: MapAreaProperties) {
  if (mode === "native") {
    // Seam for future expo-maps implementation in dev builds.
    return (
      <View
        className="gap-2 rounded-2xl border border-neutral-200 bg-white p-4"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-sm font-semibold text-neutral-900">
          Kort
        </Text>
        <Text selectable className="text-sm text-neutral-600">
          Native map er ikke aktiveret endnu i denne build.
        </Text>
      </View>
    );
  }

  return (
    <View
      className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
      style={{ borderCurve: "continuous" }}
    >
      <View className="h-50 items-center justify-center bg-neutral-200/70">
        <Text
          selectable
          className="text-xs uppercase tracking-wide text-neutral-500"
        >
          Map preview
        </Text>
        <Text
          selectable
          className="mt-1 text-sm font-semibold text-neutral-800"
        >
          {latitude && longitude
            ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            : "Koordinater kommer snart"}
        </Text>
      </View>

      <View className="gap-1 border-t border-neutral-200 p-3">
        <Text
          selectable
          className="text-xs uppercase tracking-wide text-neutral-500"
        >
          Adresse
        </Text>
        <Text selectable className="text-sm font-medium text-neutral-900">
          {address}
        </Text>
      </View>
    </View>
  );
}
