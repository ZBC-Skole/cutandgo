import { ActivityIndicator, Text, View } from "react-native";

export default function LoadingView() {
  return (
    <View className="flex items-center justify-center flex-col gap-2 flex-1">
      <ActivityIndicator size="large" />
      <Text>Vi henter dine data....</Text>
    </View>
  );
}
