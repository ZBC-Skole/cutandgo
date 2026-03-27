import { api } from "@/convex/_generated/api";
import { AuthScreen } from "@/features/auth/screens/auth-screen";
import { EmployeeFirstLoginPasswordScreen } from "@/features/auth/screens/employee-first-login-password-screen";
import { useRole } from "@/hooks/use-role";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import LoadingView from "./loading-view";

function AuthenticatedContent({ children }: { children: React.ReactNode }) {
  const role = useRole();
  const firstLoginStatus = useQuery(
    api.backend.domains.users.index.getMyEmployeeFirstLoginStatus,
  );

  if (role.isPending || firstLoginStatus === undefined) {
    return <LoadingView />;
  }

  if (
    role.primaryRole === "medarbejder" &&
    firstLoginStatus.mustChangePassword
  ) {
    return <EmployeeFirstLoginPasswordScreen />;
  }

  return <>{children}</>;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Unauthenticated>
        <AuthScreen />
      </Unauthenticated>

      <Authenticated>
        <AuthenticatedContent>{children}</AuthenticatedContent>
      </Authenticated>

      <AuthLoading>
        <LoadingView />
      </AuthLoading>
    </>
  );
}
