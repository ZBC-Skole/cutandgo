import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Text, View } from "react-native";

export default function OverviewScreen() {
  const tasks = useQuery(api.tasks.get);
  return (
    <View className="flex justify-center items-center">
      {tasks?.map(({ _id, text }) => (
        <Text key={_id}>{text}</Text>
      ))}
    </View>
  );
}
