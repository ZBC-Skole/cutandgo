import { ONBOARDING_STEPS } from "@/features/admin/onboarding/constants";
import { AdminOnboardingStepEmployee } from "@/features/admin/onboarding/steps/admin-onboarding-step-employee";
import { AdminOnboardingStepEmployeeHours } from "@/features/admin/onboarding/steps/admin-onboarding-step-employee-hours";
import { AdminOnboardingStepOpeningHours } from "@/features/admin/onboarding/steps/admin-onboarding-step-opening-hours";
import { AdminOnboardingStepSalon } from "@/features/admin/onboarding/steps/admin-onboarding-step-salon";
import { AdminOnboardingStepService } from "@/features/admin/onboarding/steps/admin-onboarding-step-service";
import { ActionButton } from "@/features/admin/onboarding/ui";
import { useAdminOnboarding } from "@/features/admin/onboarding/use-admin-onboarding";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

type AdminOnboardingShellProps = {
  onComplete: () => Promise<void>;
};

export function AdminOnboardingShell({
  onComplete,
}: AdminOnboardingShellProps) {
  const [isFinalizing, setIsFinalizing] = useState(false);
  const onboarding = useAdminOnboarding();

  async function finalizeOnboarding() {
    try {
      setIsFinalizing(true);
      await onComplete();
    } finally {
      setIsFinalizing(false);
    }
  }

  if (onboarding.isFlowCompleted) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 bg-neutral-100"
        contentContainerClassName="mx-auto w-full max-w-4xl gap-4 p-4 pb-16"
      >
        <View
          className="gap-3 rounded-2xl bg-neutral-900 p-5"
          style={{ borderCurve: "continuous" }}
        >
          <Text selectable className="text-sm font-semibold text-neutral-100">
            Din salon er klar
          </Text>
          <Text selectable className="text-sm text-neutral-300">
            Setup er gemt. Du kan nu bruge admin panelet til daglig drift og
            justere alt senere.
          </Text>
          <ActionButton
            title="Gå til admin dashboard"
            onPress={finalizeOnboarding}
            isLoading={isFinalizing}
            disabled={isFinalizing}
          />
        </View>
      </ScrollView>
    );
  }

  const isLastStep = onboarding.stepIndex === ONBOARDING_STEPS.length - 1;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-neutral-100"
      contentContainerClassName="mx-auto w-full max-w-4xl gap-4 p-4 pb-16"
    >
      <View
        className="gap-2 rounded-2xl bg-neutral-900 p-4"
        style={{ borderCurve: "continuous" }}
      >
        <Text selectable className="text-sm font-semibold text-neutral-100">
          Admin onboarding
        </Text>
        <Text selectable className="text-xs text-neutral-300">
          Hvad sker der nu? Vi sætter salon, tider, medarbejder og services op.
          Estimeret tid: 3-5 min.
        </Text>
        <Text selectable className="text-xs text-neutral-300">
          Step {onboarding.stepIndex + 1} af {ONBOARDING_STEPS.length}:{" "}
          {ONBOARDING_STEPS[onboarding.stepIndex]}
        </Text>
        <View
          className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-700"
          style={{ borderCurve: "continuous" }}
        >
          <View
            className="h-full rounded-full bg-white"
            style={{
              width: `${onboarding.progressPercent}%`,
              borderCurve: "continuous",
            }}
          />
        </View>
      </View>

      {onboarding.stepIndex === 0 ? (
        <AdminOnboardingStepSalon
          salons={onboarding.salons}
          selectedSalonId={onboarding.selectedSalonId}
          onSelectSalon={onboarding.setSelectedSalonId}
          salonForm={onboarding.salonForm}
          onChangeName={onboarding.updateSalonName}
          onChangeSlug={onboarding.updateSalonSlug}
          addressQuery={onboarding.addressQuery}
          onChangeAddressQuery={onboarding.setAddressQuery}
          onSearchAddress={onboarding.onSearchAddress}
          onUseCurrentLocation={onboarding.onUseCurrentLocation}
          isSearchingAddress={onboarding.isSearchingAddress}
          isUsingCurrentLocation={onboarding.isUsingCurrentLocation}
          addressSearchFeedback={onboarding.addressSearchFeedback}
        />
      ) : null}

      {onboarding.stepIndex === 1 ? (
        <AdminOnboardingStepOpeningHours
          salonWeek={onboarding.salonWeek}
          setSalonWeek={onboarding.setSalonWeek}
        />
      ) : null}

      {onboarding.stepIndex === 2 ? (
        <AdminOnboardingStepEmployee
          employeeForm={onboarding.employeeForm}
          onChangeEmployeeForm={onboarding.setEmployeeForm}
          employees={onboarding.employees}
          selectedEmployeeId={onboarding.selectedEmployeeId}
          onSelectEmployee={onboarding.setSelectedEmployeeId}
          selectedAssignRole={onboarding.selectedAssignRole}
          onSelectAssignRole={onboarding.setSelectedAssignRole}
          selectedSalonAssignedEmployeesCount={
            onboarding.selectedSalonAssignedEmployees.length
          }
        />
      ) : null}

      {onboarding.stepIndex === 3 ? (
        <AdminOnboardingStepEmployeeHours
          employeeWeek={onboarding.employeeWeek}
          setEmployeeWeek={onboarding.setEmployeeWeek}
        />
      ) : null}

      {onboarding.stepIndex === 4 ? (
        <AdminOnboardingStepService
          categoryForm={onboarding.categoryForm}
          onChangeCategoryForm={onboarding.setCategoryForm}
          categories={onboarding.categoriesWithServices}
          selectedCategoryId={onboarding.selectedCategoryId}
          onSelectCategory={onboarding.setSelectedCategoryId}
          serviceForm={onboarding.serviceForm}
          onChangeServiceForm={onboarding.setServiceForm}
        />
      ) : null}

      {onboarding.stepValidationMessage ? (
        <View
          className="rounded-xl border border-amber-200 bg-amber-50 p-3"
          style={{ borderCurve: "continuous" }}
        >
          <Text selectable className="text-sm text-amber-700">
            {onboarding.stepValidationMessage}
          </Text>
        </View>
      ) : null}

      <View className="flex-row gap-2">
        <View className="flex-1">
          <ActionButton
            title="Tilbage"
            onPress={onboarding.previousStep}
            disabled={onboarding.stepIndex === 0 || onboarding.isSavingStep}
            variant="light"
          />
        </View>
        <View className="flex-1">
          <ActionButton
            title={isLastStep ? "Afslut setup" : "Gem og fortsæt"}
            onPress={onboarding.nextStep}
            disabled={!onboarding.canContinue || onboarding.isSavingStep}
            isLoading={onboarding.isSavingStep}
          />
        </View>
      </View>
    </ScrollView>
  );
}
