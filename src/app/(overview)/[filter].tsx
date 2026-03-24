import { RoleGuard } from "@/components/ui/role-guard";
import { OverviewListScreen } from "@/features/overview/screens/overview-list-screen";

export default function OverviewFilterRoute() {
  return (
    <RoleGuard allow={["kunde", "medarbejder"]} fallbackHref="/admin">
      <OverviewListScreen />
    </RoleGuard>
  );
}
