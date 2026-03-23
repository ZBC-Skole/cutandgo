import type { TimeInterval } from "@/features/booking/types";

const SLOT_STEP_MINUTES = 15;

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const paddedHours = String(hours).padStart(2, "0");
  const paddedMinutes = String(minutes).padStart(2, "0");
  return `${paddedHours}:${paddedMinutes}`;
}

export function getEndTime(startTime: string, durationMinutes: number): string {
  const startMinutes = parseTimeToMinutes(startTime);
  return formatMinutesToTime(startMinutes + durationMinutes);
}

function overlaps(
  startMinutes: number,
  endMinutes: number,
  blocked: TimeInterval[],
): boolean {
  return blocked.some((interval) => {
    const blockedStart = parseTimeToMinutes(interval.start);
    const blockedEnd = parseTimeToMinutes(interval.end);
    return startMinutes < blockedEnd && endMinutes > blockedStart;
  });
}

export function generateAvailableSlots(params: {
  openTime: string;
  closeTime: string;
  durationMinutes: number;
  blocked: TimeInterval[];
  stepMinutes?: number;
}): string[] {
  const step = params.stepMinutes ?? SLOT_STEP_MINUTES;
  const openMinutes = parseTimeToMinutes(params.openTime);
  const closeMinutes = parseTimeToMinutes(params.closeTime);

  const slots: string[] = [];

  for (
    let startMinutes = openMinutes;
    startMinutes + params.durationMinutes <= closeMinutes;
    startMinutes += step
  ) {
    const endMinutes = startMinutes + params.durationMinutes;
    if (!overlaps(startMinutes, endMinutes, params.blocked)) {
      slots.push(formatMinutesToTime(startMinutes));
    }
  }

  return slots;
}
