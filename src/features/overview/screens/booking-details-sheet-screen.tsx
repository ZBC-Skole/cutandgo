import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import LoadingView from "@/components/ui/loading-view";
import { MapArea } from "@/features/overview/components/map-area";
import {
  formatDurationMinutes,
  formatOverviewDate,
  formatOverviewTime,
} from "@/features/overview/lib/date-time";
import { overviewMapMode } from "@/features/overview/lib/map-mode";
import { openRouteInMaps } from "@/features/overview/lib/open-route";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

const referenceSlots = ["Forfra", "Side", "Bagfra"];

export function BookingDetailsSheetScreen() {
  const parameters = useLocalSearchParams<{ id?: string | string[] }>();
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const createUploadUrl = useMutation(api.media.createUploadUrl);
  const attachBookingPhoto = useMutation(api.media.attachBookingPhoto);

  const appointmentId = Array.isArray(parameters.id)
    ? parameters.id[0]
    : parameters.id;

  const booking = useQuery(
    api.bookings.getViewerBookingDetail,
    appointmentId ? { bookingId: appointmentId as Id<"bookings"> } : "skip",
  );

  if (!appointmentId || booking === undefined) {
    return <LoadingView />;
  }

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
            Vi kunne ikke finde denne booking.
          </Text>
        </View>
      </>
    );
  }

  const bookingDetail = booking;
  const startsAt = new Date(bookingDetail.startsAt);
  const endsAt = new Date(bookingDetail.endAt);
  const referencePhotoUris = bookingDetail.referencePhotoUris.slice(0, 3);

  async function handleOpenRoute() {
    const opened = await openRouteInMaps({
      address: bookingDetail.address,
      latitude: bookingDetail.latitude,
      longitude: bookingDetail.longitude,
    });

    if (!opened) {
      Alert.alert("Kunne ikke åbne kort", "Prøv igen om et øjeblik.");
    }
  }

  async function pickImageForSlot(slotIndex: number) {
    if (referencePhotoUris[slotIndex]) {
      Alert.alert(
        "Billede findes allerede",
        "Udskiftning af referencebilleder kommer senere. Dette billede er allerede gemt i systemet.",
      );
      return;
    }

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

    try {
      setUploadingSlot(slotIndex);
      const uploadUrl = await createUploadUrl({});
      const fileResponse = await fetch(selectedPhotoUri);
      const blob = await fileResponse.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": blob.type || "image/jpeg",
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload fejlede.");
      }

      const payload = (await uploadResponse.json()) as {
        storageId?: Id<"_storage">;
      };
      if (!payload.storageId) {
        throw new Error("Storage ID mangler efter upload.");
      }

      await attachBookingPhoto({
        bookingId: bookingDetail.id as Id<"bookings">,
        storageId: payload.storageId,
        photoType: "reference",
        caption: referenceSlots[slotIndex],
      });
    } catch (error) {
      Alert.alert("Kunne ikke gemme billede", String(error));
    } finally {
      setUploadingSlot(null);
    }
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
              Medarbejder:{" "}
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
                {formatDurationMinutes(bookingDetail.durationMinutes)}
              </Text>
            </Text>
            <Text selectable className="text-sm text-neutral-600">
              Adresse:{" "}
              <Text className="font-semibold text-neutral-900">
                {bookingDetail.address}
              </Text>
            </Text>
            {bookingDetail.customerNote ? (
              <Text selectable className="text-sm text-neutral-600">
                Note:{" "}
                <Text className="font-semibold text-neutral-900">
                  {bookingDetail.customerNote}
                </Text>
              </Text>
            ) : null}
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
            address={bookingDetail.address}
            latitude={bookingDetail.latitude}
            longitude={bookingDetail.longitude}
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
            Upload op til 3 billeder. De gemmes direkte på bookingen i systemet.
          </Text>

          <View className="flex-row gap-2">
            {referenceSlots.map((label, slotIndex) => {
              const uri = referencePhotoUris[slotIndex];
              const isUploading = uploadingSlot === slotIndex;

              return (
                <View key={label} className="flex-1 gap-2">
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void pickImageForSlot(slotIndex);
                    }}
                    className="aspect-3/4 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
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
                          {isUploading ? "Uploader..." : "Tilføj"}
                        </Text>
                      </View>
                    )}
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
