import { MapArea } from "@/features/overview/components/map-area";
import { demoOverviewAppointments } from "@/features/overview/data/demo-overview-appointments";
import { findOverviewAppointmentById } from "@/features/overview/lib/appointments";
import {
  formatDurationMinutes,
  formatOverviewDate,
  formatOverviewTime,
} from "@/features/overview/lib/date-time";
import { overviewMapMode } from "@/features/overview/lib/map-mode";
import { openRouteInMaps } from "@/features/overview/lib/open-route";
import { appointmentReferencePhotoByIdAtom } from "@/features/overview/state/overview-atoms";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAtom } from "jotai";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

const referenceSlots = ["Forfra", "Side", "Bagfra"];

export function BookingDetailsSheetScreen() {
  const parameters = useLocalSearchParams<{ id?: string | string[] }>();
  const [referencePhotosById, setReferencePhotosById] = useAtom(
    appointmentReferencePhotoByIdAtom,
  );

  const appointmentId = Array.isArray(parameters.id)
    ? parameters.id[0]
    : parameters.id;

  const booking = appointmentId
    ? findOverviewAppointmentById(demoOverviewAppointments, appointmentId)
    : null;

  if (!booking) {
    return (
      <>
        <Stack.Screen options={{ title: "Booking detaljer" }} />
        <View
          className="flex-1 items-center justify-center bg-neutral-100 p-6"
          style={{ borderCurve: "continuous" }}
        >
          <Text selectable className="text-base font-semibold text-neutral-900">
            Booking ikke fundet
          </Text>
          <Text
            selectable
            className="mt-2 text-center text-sm text-neutral-600"
          >
            Vi kunne ikke finde denne currentBooking.
          </Text>
        </View>
      </>
    );
  }

  const currentBooking = booking;

  const startsAt = new Date(currentBooking.startsAt);
  const endsAt = new Date(
    startsAt.getTime() + currentBooking.durationMinutes * 60_000,
  );
  const referencePhotoUris =
    referencePhotosById[currentBooking.id] ??
    currentBooking.referencePhotoUris ??
    [];

  async function handleOpenRoute() {
    const opened = await openRouteInMaps({
      address: currentBooking.address,
      latitude: currentBooking.latitude,
      longitude: currentBooking.longitude,
    });

    if (!opened) {
      Alert.alert("Kunne ikke åbne kort", "Prøv igen om et øjeblik.");
    }
  }

  async function pickImageForSlot(slotIndex: number) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Tilladelse mangler",
        "Giv adgang til billeder for at tilføje reference.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (result.canceled) {
      return;
    }

    const selectedPhotoUri = result.assets[0]?.uri;
    if (!selectedPhotoUri) {
      return;
    }

    setReferencePhotosById((current) => {
      const next = [
        ...(current[currentBooking.id] ??
          currentBooking.referencePhotoUris ??
          []),
      ];
      next[slotIndex] = selectedPhotoUri;
      return {
        ...current,
        [currentBooking.id]: next.slice(0, 3),
      };
    });
  }

  function clearImageFromSlot(slotIndex: number) {
    setReferencePhotosById((current) => {
      const next = [
        ...(current[currentBooking.id] ??
          currentBooking.referencePhotoUris ??
          []),
      ];
      next[slotIndex] = "";
      return {
        ...current,
        [currentBooking.id]: next,
      };
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: "Booking detaljer" }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-neutral-100"
        contentContainerClassName="gap-4 p-4 pb-10"
      >
        <View
          className="gap-3 rounded-2xl bg-white p-4"
          style={{ borderCurve: "continuous" }}
        >
          <Text selectable className="text-2xl font-bold text-neutral-900">
            {currentBooking.serviceName}
          </Text>

          <View className="gap-1">
            <Text selectable className="text-sm text-neutral-600">
              Salon:{" "}
              <Text className="font-semibold text-neutral-900">
                {currentBooking.salonName}
              </Text>
            </Text>
            <Text selectable className="text-sm text-neutral-600">
              Stylist:{" "}
              <Text className="font-semibold text-neutral-900">
                {currentBooking.stylistName}
              </Text>
            </Text>
            <Text selectable className="text-sm text-neutral-600">
              Tid:{" "}
              <Text className="font-semibold text-neutral-900">
                {formatOverviewDate(startsAt)}, {formatOverviewTime(startsAt)} -{" "}
                {formatOverviewTime(endsAt)}
              </Text>
            </Text>
            <Text selectable className="text-sm text-neutral-600">
              Varighed:{" "}
              <Text className="font-semibold text-neutral-900">
                {formatDurationMinutes(currentBooking.durationMinutes)}
              </Text>
            </Text>
            <Text selectable className="text-sm text-neutral-600">
              Adresse:{" "}
              <Text className="font-semibold text-neutral-900">
                {currentBooking.address}
              </Text>
            </Text>
          </View>
        </View>

        <View
          className="gap-3 rounded-2xl bg-white p-4"
          style={{ borderCurve: "continuous" }}
        >
          <Text
            selectable
            className="text-sm font-semibold uppercase tracking-wide text-neutral-500"
          >
            Lokation
          </Text>

          <MapArea
            mode={overviewMapMode}
            address={currentBooking.address}
            latitude={currentBooking.latitude}
            longitude={currentBooking.longitude}
          />

          <Pressable
            accessibilityRole="button"
            onPress={handleOpenRoute}
            className="items-center rounded-xl bg-blue-600 px-4 py-3"
            style={{ borderCurve: "continuous" }}
          >
            <Text selectable className="text-sm font-semibold text-white">
              Åbn rute
            </Text>
          </Pressable>
        </View>

        <View
          className="gap-3 rounded-2xl bg-white p-4"
          style={{ borderCurve: "continuous" }}
        >
          <Text
            selectable
            className="text-sm font-semibold uppercase tracking-wide text-neutral-500"
          >
            Reference billeder
          </Text>
          <Text selectable className="text-sm text-neutral-600">
            Tilføj op til 3 billeder (forfra, side, bagfra).
          </Text>

          <View className="flex-row gap-2">
            {referenceSlots.map((label, slotIndex) => {
              const uri = referencePhotoUris[slotIndex];

              return (
                <View key={label} className="flex-1 gap-2">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => pickImageForSlot(slotIndex)}
                    className="aspect-[3/4] overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
                    style={{ borderCurve: "continuous" }}
                  >
                    {uri ? (
                      <Image
                        source={{ uri }}
                        style={{ height: "100%", width: "100%" }}
                        contentFit="cover"
                      />
                    ) : (
                      <View className="flex-1 items-center justify-center gap-1">
                        <Ionicons
                          name="image-outline"
                          size={22}
                          color="#9CA3AF"
                        />
                        <Text selectable className="text-xs text-neutral-500">
                          Tilføj
                        </Text>
                      </View>
                    )}

                    {uri ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => clearImageFromSlot(slotIndex)}
                        className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60"
                      >
                        <Ionicons name="close" size={14} color="white" />
                      </Pressable>
                    ) : null}
                  </Pressable>

                  <Text
                    selectable
                    className="text-center text-xs font-medium text-neutral-500"
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </>
  );
}
