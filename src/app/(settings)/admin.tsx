import { RoleGuard } from "@/components/ui/role-guard";
import { AdminScreen } from "@/features/admin/screens/admin-screen";

export default function AdminRoute() {
  return (
    <RoleGuard allow={["admin"]} fallbackHref="/">
      <AdminScreen />
    </RoleGuard>
  );
}
