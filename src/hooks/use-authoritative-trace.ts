import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { IntentSlots, ReasoningTrace } from "@/core/types";
import { confirmReasoning } from "@/lib/reasoning.functions";
import { hasCoreSlots, isAssessmentComplete } from "@/core/questions";
import { useSession } from "@/lib/session";
import { reasoningQueryKey } from "./reasoning-query-key";

type ConfirmedTrace = ReasoningTrace & {
  persistence?:
    | {
        status: "persisted";
        sessionId: string;
        sessionCapability?: string;
        caseId: string;
        decisionRunId: string;
        reused: boolean;
      }
    | { status: "disabled"; reason: string };
};

export function useAuthoritativeTrace(): {
  trace: ReasoningTrace;
  confirming: boolean;
  confirmed: boolean;
  confirmationFailed: boolean;
  persistenceDisabled: boolean;
  retryConfirmation: () => void;
} {
  const { state, update, trace } = useSession();
  const confirm = useServerFn(confirmReasoning);
  const ready = Boolean(state.slots.amount) || hasCoreSlots(state.slots);
  const complete = isAssessmentComplete(state.slots);

  const key = React.useMemo(() => JSON.stringify(state.slots), [state.slots]);
  const latestIntentText = state.intents[state.intents.length - 1]?.text ?? null;

  const query = useQuery({
    queryKey: reasoningQueryKey(key, state.status, latestIntentText),
    enabled: ready,
    staleTime: 60_000,
    retry: 1,
    queryFn: () =>
      confirm({
        data: {
          slots: state.slots as IntentSlots,
          context: {
            sessionId: state.backend?.sessionId ?? null,
            sessionCapability: state.backend?.sessionCapability ?? null,
            caseId: state.backend?.caseId ?? null,
            needText: latestIntentText,
            persist: complete,
          },
        },
      }),
  });

  React.useEffect(() => {
    const persistence = (query.data as ConfirmedTrace | undefined)?.persistence;
    if (!persistence || persistence.status !== "persisted") return;

    update((current) => {
      if (
        current.backend?.sessionId === persistence.sessionId &&
        current.backend?.sessionCapability === persistence.sessionCapability &&
        current.backend?.caseId === persistence.caseId &&
        current.backend?.decisionRunId === persistence.decisionRunId
      ) {
        return current;
      }
      return {
        ...current,
        backend: {
          sessionId: persistence.sessionId,
          ...(persistence.sessionCapability
            ? { sessionCapability: persistence.sessionCapability }
            : {}),
          caseId: persistence.caseId,
          decisionRunId: persistence.decisionRunId,
        },
      };
    });
  }, [query.data, update]);

  return {
    trace: !query.isError ? ((query.data as ReasoningTrace | undefined) ?? trace) : trace,
    confirming: query.isFetching,
    confirmed: Boolean(query.data) && !query.isError,
    confirmationFailed: query.isError,
    persistenceDisabled:
      (query.data as ConfirmedTrace | undefined)?.persistence?.status === "disabled" && complete,
    retryConfirmation: () => {
      void query.refetch();
    },
  };
}
