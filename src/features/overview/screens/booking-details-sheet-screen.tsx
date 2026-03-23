import { MapArea } from "@/features/overview/components/map-area";
import { demoOverviewAppointments } from "@/features/overview/data/demo-overview-appointments";
import {
  findOverviewAppointmentById,
  isOverviewAppointmentPast,
} from "@/features/overview/lib/appointments";
import {
  formatDurationMinutes,
  formatOverviewDate,
  formatOverviewTime,
} from "@/features/overview/lib/date-time";
import { overviewMapMode } from "@/features/overview/lib/map-mode";
import { openRouteInMaps } from "@/features/overview/lib/open-route";
import { appointmentReferencePhotoByIdAtom } from "@/features/overview/state/overview-atoms";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAtom } from "jotai";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

export function BookingDetailsSheetScreen() {
  const parameters = useLocalSearchParams<{ id?: string | string[] }>();
  const [referencePhotosById, setReferencePhotosById] = useAtom(
    appointmentReferencePhotoByIdAtom,
  );

  const appointmentId = Array.isArray(parameters.id)
    ? parameters.id[0]
    : parameters.id;

  const appointment = appointmentId
    ? findOverviewAppointmentById(demoOverviewAppointments, appointmentId)
    : null;

  if (!appointment) {
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
            Vi kunne ikke finde denne booking.
          </Text>
        </View>
      </>
    );
  }

  const booking = appointment;

  const startsAt = new Date(booking.startsAt);
  const endsAt = new Date(
    startsAt.getTime() + booking.durationMinutes * 60_000,
  );
  const isPast = isOverviewAppointmentPast(booking, new Date());
  const referencePhotoUri =
    referencePhotosById[booking.id] ?? booking.referencePhotoUri;

  async function handleOpenRoute() {
    const opened = await openRouteInMaps({
      address: booking.address,
      latitude: booking.latitude,
      longitude: booking.longitude,
    });

    if (!opened) {
      Alert.alert("Kunne ikke åbne kort", "Prøv igen om et øjeblik.");
    }
  }

  async function handlePickReferencePhoto() {
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

    setReferencePhotosById((current) => ({
      ...current,
      [booking.id]: selectedPhotoUri,
    }));
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
            {booking.serviceName}
          </Text>

          <View className="gap-1">
            <Text selectable className="text-sm text-neutral-600">
              Salon:{" "}
              <Text className="font-semibold text-neutral-900">
                {booking.salonName}
              </Text>
            </Text>
            <Text selectable className="text-sm text-neutral-600">
              Stylist:{" "}
              <Text className="font-semibold text-neutral-900">
                {booking.stylistName}
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
                {formatDurationMinutes(booking.durationMinutes)}
              </Text>
            </Text>
            <Text selectable className="text-sm text-neutral-600">
              Adresse:{" "}
              <Text className="font-semibold text-neutral-900">
                {booking.address}
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
            address={booking.address}
            latitude={booking.latitude}
            longitude={booking.longitude}
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
            Reference
          </Text>

          {referencePhotoUri ? (
            <View
              className="h-60 w-full overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
              style={{ borderCurve: "continuous" }}
            >
              <Image
                source={{ uri: referencePhotoUri }}
                style={{ height: "100%", width: "100%" }}
                contentFit="cover"
              />
            </View>
          ) : (
            <View
              className="h-40 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-100"
              style={{ borderCurve: "continuous" }}
            >
              <Text
                selectable
                className="text-xs uppercase tracking-wide text-neutral-400"
              >
                Preview
              </Text>
              <Text selectable className="text-sm text-neutral-500">
                Ingen referencefoto endnu.
              </Text>
            </View>
          )}

          {!isPast ? (
            <Pressable
              accessibilityRole="button"
              onPress={handlePickReferencePhoto}
              className="items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
              style={{ borderCurve: "continuous" }}
            >
              <Text selectable className="text-sm font-semibold text-blue-700">
                {referencePhotoUri ? "Skift foto" : "Tilføj foto"}
              </Text>
            </Pressable>
          ) : (
            <View
              className="rounded-xl border border-neutral-200 bg-neutral-100 px-4 py-3"
              style={{ borderCurve: "continuous" }}
            >
              <Text selectable className="text-sm text-neutral-500">
                Tidligere booking: reference vises kun som læsning.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
