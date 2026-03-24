import type { Id } from "@/convex/_generated/dataModel";
import {
  ActionButton,
  Field,
  Section,
  SelectPills,
} from "@/features/admin/onboarding/ui";
import { ActivityIndicator, Text, View } from "react-native";

type SalonOption = {
  _id: Id<"salons">;
  name: string;
};

type SalonStepProps = {
  salons: SalonOption[];
  selectedSalonId: Id<"salons"> | null;
  onSelectSalon: (value: Id<"salons">) => void;
  salonForm: {
    name: string;
    slug: string;
    addressLine1: string;
    postalCode: string;
    city: string;
    latitude: string;
    longitude: string;
  };
  onChangeName: (value: string) => void;
  onChangeSlug: (value: string) => void;
  addressQuery: string;
  onChangeAddressQuery: (value: string) => void;
  onSearchAddress: () => Promise<void>;
  onUseCurrentLocation: () => Promise<void>;
  isSearchingAddress: boolean;
  isUsingCurrentLocation: boolean;
  addressSearchFeedback: string | null;
};

export function AdminOnboardingStepSalon(props: SalonStepProps) {
  return (
    <Section
      title="1. Vælg eller opret salon"
      subtitle="Start med at vælge en salon, eller opret en ny. Når du fortsætter, gemmer vi salonen."
    >
      <SelectPills
        options={props.salons.map((salon) => ({
          label: salon.name,
          value: salon._id,
        }))}
        selected={props.selectedSalonId}
        onSelect={props.onSelectSalon}
      />

      <Field
        label="Navn"
        placeholder="Cut&Go"
        value={props.salonForm.name}
        onChangeText={props.onChangeName}
      />
      <Field
        label="Slug"
        value={props.salonForm.slug}
        onChangeText={props.onChangeSlug}
        placeholder="cutgo-kbh-c"
      />
      <Field
        label="Søg adresse"
        value={props.addressQuery}
        onChangeText={props.onChangeAddressQuery}
        placeholder="Fx Vesterbrogade 17, København"
        onSubmitEditing={props.onSearchAddress}
        returnKeyType="search"
      />

      <View className="flex-row gap-2">
        <View className="flex-1">
          <ActionButton
            title={
              props.isSearchingAddress ? "Søger adresse..." : "Find adresse"
            }
            onPress={props.onSearchAddress}
            disabled={
              props.isSearchingAddress || props.addressQuery.trim().length < 3
            }
            variant="light"
          />
        </View>
        <View className="flex-1">
          <ActionButton
            title={
              props.isUsingCurrentLocation
                ? "Henter lokation..."
                : "Brug min lokation"
            }
            onPress={props.onUseCurrentLocation}
            disabled={props.isUsingCurrentLocation}
            variant="light"
          />
        </View>
      </View>

      {props.isSearchingAddress ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#171717" />
          <Text selectable className="text-xs text-neutral-600">
            Finder de bedste adresser...
          </Text>
        </View>
      ) : null}

      {props.addressSearchFeedback ? (
        <Text selectable className="text-xs text-neutral-600">
          {props.addressSearchFeedback}
        </Text>
      ) : null}

      <View
        className="gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-xs font-semibold text-neutral-600">
          Valgt lokation
        </Text>
        <Text selectable className="text-sm text-neutral-800">
          {props.salonForm.addressLine1 || "Ingen adresse valgt endnu"}
        </Text>
        <Text selectable className="text-xs text-neutral-500">
          {props.salonForm.postalCode || "----"} {props.salonForm.city || ""}
        </Text>
        <Text selectable className="text-xs text-neutral-500">
          {props.salonForm.latitude && props.salonForm.longitude
            ? `${props.salonForm.latitude}, ${props.salonForm.longitude}`
            : "Lokation ikke valgt endnu"}
        </Text>
      </View>
    </Section>
  );
}
