import { RoleGuard } from "@/components/ui/role-guard";
import { AdminServicesScreen } from "@/features/admin/screens/admin-services-screen";

export default function ServicesRoute() {
  return (
    <RoleGuard allow={["admin"]} fallbackHref="/">
      <AdminServicesScreen />
    </RoleGuard>
  );
}
