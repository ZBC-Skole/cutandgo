import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import type { AppRole } from "@/lib/auth-roles";
import { useQuery } from "convex/react";

type UseRoleResult = {
  isPending: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  primaryRole: AppRole | null;
  hasRole: (role: AppRole) => boolean;
};

export function useRole(): UseRoleResult {
  const sessionState = authClient.useSession();
  const roleFromDb = useQuery(api.backend.domains.users.roles.getMyRole);
  const resolvedRole: AppRole = roleFromDb ?? "kunde";
  const roles: AppRole[] = [resolvedRole];

  const isAdmin = roles.includes("admin");

  function hasRole(role: AppRole) {
    return roles.includes(role);
  }

  return {
    isPending: sessionState.isPending || roleFromDb === undefined,
    roles,
    isAdmin,
    primaryRole: resolvedRole,
    hasRole,
  };
}
