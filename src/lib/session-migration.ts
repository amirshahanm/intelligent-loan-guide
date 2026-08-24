import type { LiquidityFactorKey, LiquidityInput } from "@/core/liquidity";

export type LiquidityJourneySessionFields = {
  liquidity: LiquidityInput;
  liquidityAskedFactors: LiquidityFactorKey[];
  liquiditySkippedFactors: LiquidityFactorKey[];
};

/** Adds safe journey defaults without changing any other anonymous-session data. */
export function normalizeLiquidityJourneyState<T extends object>(
  parsed: T & Partial<LiquidityJourneySessionFields>,
): T & LiquidityJourneySessionFields {
  return {
    ...parsed,
    liquidity: parsed.liquidity ?? {},
    liquidityAskedFactors: parsed.liquidityAskedFactors ?? [],
    liquiditySkippedFactors: parsed.liquiditySkippedFactors ?? [],
  };
}
