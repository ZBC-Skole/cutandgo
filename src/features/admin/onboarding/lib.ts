import { WEEK_DAYS } from "./constants";
import type { DayDraft } from "./types";

export function createSlugFromName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function createDefaultWeek(): DayDraft[] {
  return WEEK_DAYS.map((item) => ({
    weekday: item.weekday,
    opensAt: "09:00",
    closesAt: "17:00",
    isClosed: item.weekday === 0,
  }));
}
