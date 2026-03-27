import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useRole } from "@/hooks/use-role";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

type UseAdminOnboardingGateResult = {
  isPending: boolean;
  shouldShowOnboarding: boolean;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
  state: Doc<"adminOnboardingStates"> | null | undefined;
};

export function useAdminOnboardingGate(): UseAdminOnboardingGateResult {
  const role = useRole();
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [hasRequestedEnsure, setHasRequestedEnsure] = useState(false);

  const state = useQuery(
    api.backend.domains.admin.index.getMyAdminOnboardingState,
    role.isAdmin ? {} : "skip",
  );
  const ensureMyState = useMutation(
    api.backend.domains.admin.index.ensureMyState,
  );
  const completeMy = useMutation(api.backend.domains.admin.index.completeMy);
  const resetMy = useMutation(api.backend.domains.admin.index.resetMy);

  useEffect(() => {
    if (!role.isAdmin || role.isPending) {
      return;
    }
    if (state !== null || isEnsuring || hasRequestedEnsure) {
      return;
    }

    let cancelled = false;
    async function runEnsure() {
      try {
        setIsEnsuring(true);
        setHasRequestedEnsure(true);
        await ensureMyState({});
      } finally {
        if (!cancelled) {
          setIsEnsuring(false);
        }
      }
    }

    void runEnsure();
    return () => {
      cancelled = true;
    };
  }, [
    ensureMyState,
    hasRequestedEnsure,
    isEnsuring,
    role.isAdmin,
    role.isPending,
    state,
  ]);

  const complete = useCallback(async () => {
    await completeMy({});
  }, [completeMy]);

  const reset = useCallback(async () => {
    setHasRequestedEnsure(false);
    await resetMy({});
  }, [resetMy]);

  const isPending =
    role.isPending || (role.isAdmin && (state === undefined || isEnsuring));
  const shouldShowOnboarding =
    role.isAdmin && !isPending && Boolean(state && !state.completedAt);

  return {
    isPending,
    shouldShowOnboarding,
    complete,
    reset,
    state,
  };
}
