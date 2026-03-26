import { RoleGuard } from "@/components/ui/role-guard";
import { AdminSalonSettingsScreen } from "@/features/admin/screens/admin-salon-settings-screen";

export default function AdminRoute() {
  return (
    <RoleGuard allow={["admin"]} fallbackHref="/">
      <AdminSalonSettingsScreen />
    </RoleGuard>
  );
}
