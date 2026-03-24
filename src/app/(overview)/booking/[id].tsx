import { RoleGuard } from "@/components/ui/role-guard";
import { BookingDetailsSheetScreen } from "@/features/overview/screens/booking-details-sheet-screen";

export default function BookingDetailsRoute() {
  return (
    <RoleGuard allow={["kunde", "medarbejder"]} fallbackHref="/admin">
      <BookingDetailsSheetScreen />
    </RoleGuard>
  );
}
