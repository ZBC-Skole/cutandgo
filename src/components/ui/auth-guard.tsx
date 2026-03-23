import { AuthScreen } from "@/features/auth/screens/auth-screen";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Fragment } from "react";
import LoadingView from "./loading-view";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <Fragment>
      <Unauthenticated>
        <AuthScreen />
      </Unauthenticated>

      <Authenticated>{children}</Authenticated>

      <AuthLoading>
        <LoadingView />
      </AuthLoading>
    </Fragment>
  );
}
