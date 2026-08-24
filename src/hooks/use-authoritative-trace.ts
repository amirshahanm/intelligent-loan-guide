import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { IntentSlots, ReasoningTrace } from "@/core/types";
import { confirmReasoning } from "@/lib/reasoning.functions";
import { hasCoreSlots, isAssessmentComplete } from "@/core/questions";
import { useSession } from "@/lib/session";

type ConfirmedTrace = ReasoningTrace & {
  persistence?:
    | {
        status: "persisted";
        sessionId: string;
        caseId: string;
        decisionRunId: string;
        reused: boolean;
      }
    | { status: "disabled"; reason: string };
};

/**
 * Client preview renders instantly; the server re-runs the same engine on the
 * submitted snapshot and its verdict replaces the preview when it lands.
 * Persistence only starts once the assessment reaches the real decision gate.
 */
export function useAuthoritativeTrace(): {
  trace: ReasoningTrace;
  confirming: boolean;
  confirmed: boolean;
} {
  const { state, update, trace } = useSession();
  const confirm = useServerFn(confirmReasoning);
  const ready = Boolean(state.slots.amount) || hasCoreSlots(state.slots);
  const complete = isAssessmentComplete(state.slots);

  const key = React.useMemo(() => JSON.stringify(state.slots), [state.slots]);
  const latestIntentText = state.intents[state.intents.length - 1]?.text ?? null;

  const query = useQuery({
    queryKey: ["reasoning", key],
    enabled: ready,
    staleTime: 60_000,
    queryFn: () =>
      confirm({
        data: {
          slots: state.slots as IntentSlots,
          context: {
            sessionId: state.backend?.sessionId ?? null,
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
        current.backend?.caseId === persistence.caseId &&
        current.backend?.decisionRunId === persistence.decisionRunId
      ) {
        return current;
      }
      return {
        ...current,
        backend: {
          sessionId: persistence.sessionId,
          caseId: persistence.caseId,
          decisionRunId: persistence.decisionRunId,
        },
      };
    });
  }, [query.data, update]);

  return {
    trace: (query.data as ReasoningTrace | undefined) ?? trace,
    confirming: query.isFetching,
    confirmed: Boolean(query.data),
  };
}
