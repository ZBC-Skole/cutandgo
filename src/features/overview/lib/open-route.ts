import * as Linking from "expo-linking";
import { Platform } from "react-native";

type RouteOptions = {
  address: string;
  latitude?: number;
  longitude?: number;
};

export async function openRouteInMaps({
  address,
  latitude,
  longitude,
}: RouteOptions) {
  const encodedAddress = encodeURIComponent(address);
  const hasCoordinates =
    typeof latitude === "number" && typeof longitude === "number";

  const url = (() => {
    if (Platform.OS === "ios") {
      if (hasCoordinates) {
        return `http://maps.apple.com/?daddr=${latitude},${longitude}`;
      }

      return `http://maps.apple.com/?q=${encodedAddress}`;
    }

    if (Platform.OS === "android") {
      if (hasCoordinates) {
        return `geo:0,0?q=${latitude},${longitude}(${encodedAddress})`;
      }

      return `geo:0,0?q=${encodedAddress}`;
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  })();

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    return false;
  }

  await Linking.openURL(url);
  return true;
}
