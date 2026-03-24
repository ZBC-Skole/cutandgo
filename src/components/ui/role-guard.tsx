import { useRole } from "@/hooks/use-role";
import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import LoadingView from "./loading-view";

type RoleGuardProps = {
  allow: ("admin" | "medarbejder" | "kunde")[];
  fallbackHref: string;
  children: ReactNode;
};

export function RoleGuard({ allow, fallbackHref, children }: RoleGuardProps) {
  const role = useRole();

  if (role.isPending) {
    return <LoadingView />;
  }

  if (!role.primaryRole || !allow.includes(role.primaryRole)) {
    return <Redirect href={fallbackHref} />;
  }

  return <>{children}</>;
}
