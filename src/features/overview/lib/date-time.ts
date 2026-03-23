const dateFormatter = new Intl.DateTimeFormat("da-DK", {
  day: "2-digit",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("da-DK", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatOverviewDate(date: Date) {
  return dateFormatter.format(date).replace(".", "");
}

export function formatOverviewTime(date: Date) {
  return timeFormatter.format(date);
}

export function formatDurationMinutes(durationMinutes: number) {
  if (durationMinutes < 60) {
    return `${durationMinutes} min`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (minutes === 0) {
    return `${hours} t`;
  }

  return `${hours} t ${minutes} min`;
}
