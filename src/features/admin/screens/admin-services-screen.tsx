import LoadingView from "@/components/ui/loading-view";
import {
  AdminServicesHeader,
  CreateCategorySection,
  CreateServiceSection,
  SalonSelectorSection,
  ServiceMetricsSection,
  ServicesListSection,
} from "@/features/admin/components/admin-services-sections";
import { useAdminServicesScreen } from "@/features/admin/hooks/use-admin-services-screen";
import { ScrollView } from "react-native";

export function AdminServicesScreen() {
  const screen = useAdminServicesScreen();

  if (
    !screen.salons ||
    (screen.selectedSalonId && screen.categories === undefined)
  ) {
    return <LoadingView />;
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-[#f5f5f7]"
      contentContainerClassName="mx-auto w-full max-w-6xl gap-5 px-4 pb-20"
    >
      <AdminServicesHeader />
      <SalonSelectorSection screen={screen} />
      <ServiceMetricsSection screen={screen} />
      <CreateCategorySection screen={screen} />
      <CreateServiceSection screen={screen} />
      <ServicesListSection screen={screen} />
    </ScrollView>
  );
}
