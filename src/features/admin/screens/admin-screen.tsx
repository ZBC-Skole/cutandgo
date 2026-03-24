import LoadingView from "@/components/ui/loading-view";
import { useAdminOnboardingGate } from "@/features/admin/hooks/use-admin-onboarding-gate";
import { AdminOnboardingShell } from "@/features/admin/onboarding/admin-onboarding-shell";
import { AdminDashboardScreen } from "@/features/admin/screens/admin-dashboard-screen";

export function AdminScreen() {
  const onboardingGate = useAdminOnboardingGate();

  if (onboardingGate.isPending) {
    return <LoadingView />;
  }

  if (onboardingGate.shouldShowOnboarding) {
    return <AdminOnboardingShell onComplete={onboardingGate.complete} />;
  }

  return <AdminDashboardScreen />;
}
