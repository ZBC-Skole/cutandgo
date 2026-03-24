import { AuthScreen } from "@/features/auth/screens/auth-screen";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import LoadingView from "./loading-view";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Unauthenticated>
        <AuthScreen />
      </Unauthenticated>

      <Authenticated>{children}</Authenticated>

      <AuthLoading>
        <LoadingView />
      </AuthLoading>
    </>
  );
}
