import { RoleGuard } from "@/components/ui/role-guard";
import { AdminEmployeesScreen } from "@/features/admin/screens/admin-employees-screen";

export default function AdminEmployeesRoute() {
  return (
    <RoleGuard allow={["admin"]} fallbackHref="/">
      <AdminEmployeesScreen />
    </RoleGuard>
  );
}
