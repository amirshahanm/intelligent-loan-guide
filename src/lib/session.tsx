import * as React from "react";
import type { CapturedIntent, IntentSlots, ReasoningTrace, SlotKey } from "@/core/types";
import { runReasoning } from "@/core/engine";
import { bindAnalyticsSession, track } from "@/lib/analytics";
import type { CreditResult, Handoff } from "@/lib/providers";
import type { LiquidityFactorKey, LiquidityInput } from "@/core/liquidity";
import { normalizeLiquidityJourneyState } from "@/lib/session-migration";

/**
 * No-Login First session store.
 *
 * `anonSessionId` is a continuity key for the local experience only. It is
 * explicitly NOT an authorization credential: when persistence and auth land,
 * ownership and access control are enforced server-side and claim/merge is a
 * verified server operation.
 */

export type SessionStatus = "ANONYMOUS" | "ENGAGED" | "IDENTIFIED" | "CLAIMED";

export type Message =
  | { id: string; role: "user"; kind: "text"; text: string; channel: "typed" | "voice" }
  | { id: string; role: "concierge"; kind: "text"; text: string }
  | { id: string; role: "concierge"; kind: "question"; questionId: string }
  | { id: string; role: "concierge"; kind: "trace"; runId: string };

export type SessionState = {
  anonSessionId: string;
  createdAt: string;
  lastSeenAt: string;
  status: SessionStatus;
  slots: IntentSlots;
  intents: CapturedIntent[];
  messages: Message[];
  askedQuestionIds: string[];
  creditResult?: CreditResult;
  handoffs: Handoff[];
  viewedProductIds: string[];
  liquidity: LiquidityInput;
  liquidityAskedFactors: LiquidityFactorKey[];
  liquiditySkippedFactors: LiquidityFactorKey[];
};

const STORAGE_KEY = "tashilradar.session.v1";

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function initialState(): SessionState {
  const now = new Date().toISOString();
  return {
    anonSessionId: newId("anon"),
    createdAt: now,
    lastSeenAt: now,
    status: "ANONYMOUS",
    slots: {},
    intents: [],
    messages: [],
    askedQuestionIds: [],
    handoffs: [],
    viewedProductIds: [],
    liquidity: {},
    liquidityAskedFactors: [],
    liquiditySkippedFactors: [],
  };
}

type Ctx = {
  state: SessionState;
  update: (fn: (s: SessionState) => SessionState) => void;
  reset: () => void;
  /** Client-side preview trace. Authoritative results come from the server. */
  trace: ReasoningTrace;
  hydrated: boolean;
};

const SessionContext = React.createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<SessionState>(() => initialState());
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = normalizeLiquidityJourneyState(JSON.parse(raw) as SessionState);
        const ageMs = Date.now() - new Date(parsed.lastSeenAt ?? parsed.createdAt).getTime();
        setState({ ...parsed, lastSeenAt: new Date().toISOString() });
        bindAnalyticsSession(parsed.anonSessionId);
        track({
          name: "return_session",
          ageBand: ageMs < 864e5 ? "today" : ageMs < 6048e5 ? "week" : "older",
        });
      } else {
        bindAnalyticsSession(state.anonSessionId);
      }
    } catch {
      /* corrupt storage is not fatal — start fresh */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota errors are non-fatal */
    }
  }, [state, hydrated]);

  const update = React.useCallback((fn: (s: SessionState) => SessionState) => {
    setState((prev) => ({ ...fn(prev), lastSeenAt: new Date().toISOString() }));
  }, []);

  const reset = React.useCallback(() => {
    const fresh = initialState();
    bindAnalyticsSession(fresh.anonSessionId);
    setState(fresh);
  }, []);

  const trace = React.useMemo(
    () => runReasoning(state.slots, { computedBy: "client-preview" }),
    [state.slots],
  );

  const value = React.useMemo(
    () => ({ state, update, reset, trace, hydrated }),
    [state, update, reset, trace, hydrated],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

export const messageId = () => newId("m");

export function slotKeys(slots: IntentSlots): SlotKey[] {
  return (Object.keys(slots) as SlotKey[]).filter((k) => slots[k] !== undefined);
}
