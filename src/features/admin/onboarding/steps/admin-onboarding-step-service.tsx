import type { Id } from "@/convex/_generated/dataModel";
import { Field, Section, SelectPills } from "@/features/admin/onboarding/ui";
import { Text, View } from "react-native";

type CategoryOption = {
  _id: Id<"serviceCategories">;
  name: string;
};

type ServiceStepProps = {
  categoryForm: {
    name: string;
    displayOrder: string;
  };
  onChangeCategoryForm: (
    updater: (prev: { name: string; displayOrder: string }) => {
      name: string;
      displayOrder: string;
    },
  ) => void;
  categories: CategoryOption[];
  selectedCategoryId: Id<"serviceCategories"> | null;
  onSelectCategory: (value: Id<"serviceCategories">) => void;
  serviceForm: {
    name: string;
    durationMinutes: string;
    priceDkk: string;
  };
  onChangeServiceForm: (
    updater: (prev: {
      name: string;
      durationMinutes: string;
      priceDkk: string;
    }) => { name: string; durationMinutes: string; priceDkk: string },
  ) => void;
};

export function AdminOnboardingStepService(props: ServiceStepProps) {
  return (
    <Section
      title="5. Opret kategori og service"
      subtitle="Tilføj mindst én kategori og én service. Når du afslutter, er din salon klar til drift."
    >
      <Field
        label="Kategori navn"
        value={props.categoryForm.name}
        onChangeText={(value) =>
          props.onChangeCategoryForm((prev) => ({ ...prev, name: value }))
        }
      />
      <Field
        label="Sortering"
        value={props.categoryForm.displayOrder}
        onChangeText={(value) =>
          props.onChangeCategoryForm((prev) => ({
            ...prev,
            displayOrder: value,
          }))
        }
        keyboardType="numeric"
      />

      <SelectPills
        options={props.categories.map((category) => ({
          label: category.name,
          value: category._id,
        }))}
        selected={props.selectedCategoryId}
        onSelect={props.onSelectCategory}
      />

      <Field
        label="Service navn"
        value={props.serviceForm.name}
        onChangeText={(value) =>
          props.onChangeServiceForm((prev) => ({ ...prev, name: value }))
        }
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Field
            label="Varighed (min)"
            value={props.serviceForm.durationMinutes}
            onChangeText={(value) =>
              props.onChangeServiceForm((prev) => ({
                ...prev,
                durationMinutes: value,
              }))
            }
            keyboardType="numeric"
          />
        </View>
        <View className="flex-1">
          <Field
            label="Pris (DKK)"
            value={props.serviceForm.priceDkk}
            onChangeText={(value) =>
              props.onChangeServiceForm((prev) => ({
                ...prev,
                priceDkk: value,
              }))
            }
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text selectable className="text-xs text-neutral-500">
        Vi opretter kategori/service når du trykker “Afslut setup”.
      </Text>
    </Section>
  );
}
