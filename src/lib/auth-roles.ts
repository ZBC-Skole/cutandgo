export type AppRole = "admin" | "medarbejder" | "kunde";

export function parseUserRoles(role: string | null | undefined): AppRole[] {
  if (!role) {
    return [];
  }

  return role
    .split(",")
    .map((entry) => entry.trim())
    .filter(
      (entry): entry is AppRole =>
        entry === "admin" || entry === "medarbejder" || entry === "kunde",
    );
}

export function hasRole(
  role: string | null | undefined,
  expected: AppRole,
): boolean {
  return parseUserRoles(role).includes(expected);
}
