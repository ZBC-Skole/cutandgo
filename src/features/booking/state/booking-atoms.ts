import {
  salons,
  serviceCategories,
  stylists,
} from "@/features/booking/data/demo-booking-data";
import { toDateKey } from "@/features/booking/lib/date-time";
import type { BookingService } from "@/features/booking/types";
import { atom } from "jotai";

const defaultSalonId = salons[0]?.id ?? "";
const defaultStylistId =
  stylists.find((stylist) => stylist.salonIds.includes(defaultSalonId))?.id ??
  null;

export const selectedSalonIdAtom = atom<string>(defaultSalonId);
export const selectedServiceAtom = atom<BookingService | null>(null);
export const selectedStylistIdAtom = atom<string | null>(defaultStylistId);
export const selectedDateKeyAtom = atom<string>(toDateKey(new Date()));
export const selectedDateTimeAtom = atom<Date | null>(null);
export const openCategoryIdAtom = atom<string>(serviceCategories[0]?.id ?? "");
export const isTimesOpenAtom = atom(true);
export const confirmationTextAtom = atom<string | null>(null);
