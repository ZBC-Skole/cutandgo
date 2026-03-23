import { ScrollView, Text, View } from "react-native";

export default function OrdersScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" className="flex-1">
      <View className="gap-3 p-4">
        <View
          className="gap-2 rounded-2xl bg-white p-4 shadow-sm"
          style={{ borderCurve: "continuous" }}
        >
          <Text selectable className="text-2xl font-bold">
            Booking
          </Text>
          <Text selectable className="text-base leading-6 text-gray-700">
            Opret og administrer bookinger hurtigt fra denne fane.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
