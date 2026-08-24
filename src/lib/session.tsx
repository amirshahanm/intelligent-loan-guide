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
 * `anonSessionId` is local continuity only. Backend session UUIDs are not
 * authorization credentials. Anonymous write continuity additionally requires
 * a server-verified capability token. That token is intentionally kept out of
 * persistent localStorage and lives only for the browser tab/session.
 */

export type SessionStatus = "ANONYMOUS" | "ENGAGED" | "IDENTIFIED" | "CLAIMED";

export type Message =
  | { id: string; role: "user"; kind: "text"; text: string; channel: "typed" | "voice" }
  | { id: string; role: "concierge"; kind: "text"; text: string }
  | { id: string; role: "concierge"; kind: "question"; questionId: string }
  | { id: string; role: "concierge"; kind: "trace"; runId: string };

export type BackendContinuity = {
  sessionId: string;
  sessionCapability?: string;
  caseId: string;
  decisionRunId: string;
};

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
  backend?: BackendContinuity;
};

const STORAGE_KEY = "tashilradar.session.v1";
const CAPABILITY_KEY = "tashilradar.backend.capability.v1";

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
        const sessionCapability = window.sessionStorage.getItem(CAPABILITY_KEY) ?? undefined;
        const restored = parsed.backend
          ? { ...parsed, backend: { ...parsed.backend, sessionCapability } }
          : parsed;
        const ageMs = Date.now() - new Date(restored.lastSeenAt ?? restored.createdAt).getTime();
        setState({ ...restored, lastSeenAt: new Date().toISOString() });
        bindAnalyticsSession(restored.anonSessionId);
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
      const persisted: SessionState = state.backend
        ? { ...state, backend: { ...state.backend, sessionCapability: undefined } }
        : state;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      if (state.backend?.sessionCapability) {
        window.sessionStorage.setItem(CAPABILITY_KEY, state.backend.sessionCapability);
      } else {
        window.sessionStorage.removeItem(CAPABILITY_KEY);
      }
    } catch {
      /* quota/privacy-mode errors are non-fatal */
    }
  }, [state, hydrated]);

  const update = React.useCallback((fn: (s: SessionState) => SessionState) => {
    setState((prev) => ({ ...fn(prev), lastSeenAt: new Date().toISOString() }));
  }, []);

  const reset = React.useCallback(() => {
    const fresh = initialState();
    bindAnalyticsSession(fresh.anonSessionId);
    try {
      window.sessionStorage.removeItem(CAPABILITY_KEY);
    } catch {
      /* ignore */
    }
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
