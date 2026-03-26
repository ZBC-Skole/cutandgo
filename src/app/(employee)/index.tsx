import { RoleGuard } from "@/components/ui/role-guard";
import { EmployeeDashboardScreen } from "@/features/employee/screens/employee-dashboard-screen";

export default function EmployeeIndexRoute() {
  return (
    <RoleGuard allow={["medarbejder"]} fallbackHref="/">
      <EmployeeDashboardScreen />
    </RoleGuard>
  );
}
