import type { IntentSlots, SlotKey } from "@/core/types";
import {
  ADVERSE_FA,
  COLLATERAL_FA,
  DEBT_FA,
  EMPLOYMENT_FA,
  GUARANTOR_FA,
  INCOME_FA,
  PURPOSE_FA,
  SLOT_FA,
  TURNOVER_FA,
  URGENCY_FA,
} from "@/core/labels";
import { formatTomanCompact } from "@/lib/money";
import { ProvenanceChip } from "@/components/provenance";

export function slotDisplayValue(slots: IntentSlots, key: SlotKey): string | null {
  switch (key) {
    case "amount":
      return slots.amount ? formatTomanCompact(slots.amount.value) : null;
    case "purpose":
      return slots.purpose ? PURPOSE_FA[slots.purpose.value] : null;
    case "employment":
      return slots.employment ? EMPLOYMENT_FA[slots.employment.value] : null;
    case "collateral":
      return slots.collateral ? COLLATERAL_FA[slots.collateral.value] : null;
    case "guarantor":
      return slots.guarantor ? GUARANTOR_FA[slots.guarantor.value] : null;
    case "incomeBand":
      return slots.incomeBand ? INCOME_FA[slots.incomeBand.value] : null;
    case "debtLoad":
      return slots.debtLoad ? DEBT_FA[slots.debtLoad.value] : null;
    case "bankTurnover":
      return slots.bankTurnover ? TURNOVER_FA[slots.bankTurnover.value] : null;
    case "adverseHistory":
      return slots.adverseHistory ? ADVERSE_FA[slots.adverseHistory.value] : null;
    case "urgency":
      return slots.urgency ? URGENCY_FA[slots.urgency.value] : null;
    case "region":
      return slots.region ? slots.region.value : null;
    default:
      return null;
  }
}

const ORDER: SlotKey[] = [
  "amount",
  "purpose",
  "employment",
  "guarantor",
  "collateral",
  "incomeBand",
  "debtLoad",
  "bankTurnover",
  "adverseHistory",
  "urgency",
  "region",
];

/** Live view of exactly what the system understood, with provenance. */
export function SlotChips({
  slots,
  onEdit,
}: {
  slots: IntentSlots;
  onEdit?: (key: SlotKey) => void;
}) {
  const filled = ORDER.filter((k) => slots[k] !== undefined);
  if (filled.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filled.map((key) => {
        const value = slotDisplayValue(slots, key);
        const provenance = slots[key]!.provenance;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onEdit?.(key)}
            className="group flex flex-col items-start gap-1 rounded-2xl border border-border bg-surface px-3 py-2 text-start transition-colors hover:border-accent/50"
          >
            <span className="text-[10px] text-muted-foreground">{SLOT_FA[key]}</span>
            <span className="num text-sm font-semibold text-foreground">{value}</span>
            <ProvenanceChip provenance={provenance} showFreshness={false} />
          </button>
        );
      })}
    </div>
  );
}
