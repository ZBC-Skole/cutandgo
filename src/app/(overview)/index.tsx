import { RoleGuard } from "@/components/ui/role-guard";
import { OverviewScreen } from "@/features/overview/screens/overview-screen";

export default function OverviewIndexRoute() {
  return (
    <RoleGuard allow={["kunde", "medarbejder"]} fallbackHref="/admin">
      <OverviewScreen />
    </RoleGuard>
  );
}
