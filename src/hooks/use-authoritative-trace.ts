import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { IntentSlots, ReasoningTrace } from "@/core/types";
import { confirmReasoning } from "@/lib/reasoning.functions";
import { hasCoreSlots } from "@/core/questions";
import { useSession } from "@/lib/session";

/**
 * Client preview renders instantly; the server re-runs the same engine on the
 * submitted snapshot and its verdict replaces the preview when it lands.
 */
export function useAuthoritativeTrace(): {
  trace: ReasoningTrace;
  confirming: boolean;
  confirmed: boolean;
} {
  const { state, trace } = useSession();
  const confirm = useServerFn(confirmReasoning);
  // Confirm as soon as the engine has anything meaningful to reason about.
  const ready = Boolean(state.slots.amount) || hasCoreSlots(state.slots);

  const key = React.useMemo(() => JSON.stringify(state.slots), [state.slots]);

  const query = useQuery({
    queryKey: ["reasoning", key],
    enabled: ready,
    staleTime: 60_000,
    queryFn: () => confirm({ data: { slots: state.slots as IntentSlots } }),
  });

  return {
    trace: (query.data as ReasoningTrace | undefined) ?? trace,
    confirming: query.isFetching,
    confirmed: Boolean(query.data),
  };
}
