import type { BookingService, ServiceCategory } from "@/features/booking/types";
import { Pressable, Text, View } from "react-native";

type ServiceCategoryPanelProps = {
  category: ServiceCategory;
  isOpen: boolean;
  selectedServiceId: string | null;
  onToggle: () => void;
  onSelectService: (service: BookingService) => void;
};

export function ServiceCategoryPanel({
  category,
  isOpen,
  selectedServiceId,
  onToggle,
  onSelectService,
}: ServiceCategoryPanelProps) {
  return (
    <View className="overflow-hidden rounded-2xl">
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        className="flex-row items-center justify-between p-3"
      >
        <View>
          <Text selectable className="text-base font-semibold text-neutral-900">
            {category.name}
          </Text>
          <Text selectable className="text-xs text-neutral-500">
            {category.services.length} behandlinger
          </Text>
        </View>
        <Text selectable className="text-lg text-neutral-500">
          {isOpen ? "−" : "+"}
        </Text>
      </Pressable>

      {isOpen ? (
        <View className="gap-2 border-t border-neutral-100 p-3">
          {category.services.map((service) => {
            const isSelected = selectedServiceId === service.id;
            return (
              <Pressable
                key={service.id}
                accessibilityRole="button"
                onPress={() => onSelectService(service)}
                className={`rounded-xl border px-3 py-3 ${
                  isSelected
                    ? "border-neutral-900 bg-neutral-900"
                    : "border-neutral-200 bg-white"
                }`}
                style={{ borderCurve: "continuous" }}
              >
                <Text
                  selectable
                  className={`text-sm font-semibold ${
                    isSelected ? "text-white" : "text-neutral-900"
                  }`}
                >
                  {service.name}
                </Text>
                <Text
                  selectable
                  className={`mt-1 text-xs ${
                    isSelected ? "text-neutral-200" : "text-neutral-500"
                  }`}
                >
                  {service.durationMinutes} min • {service.priceDkk} kr.
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
