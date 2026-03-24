import { RoleGuard } from "@/components/ui/role-guard";
import { BookingScreen } from "@/features/booking/screens/booking-screen";

export default function OrdersIndexRoute() {
  return (
    <RoleGuard allow={["kunde", "medarbejder"]} fallbackHref="/admin">
      <BookingScreen />
    </RoleGuard>
  );
}
