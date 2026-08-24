import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { AppShell } from "@/components/app-shell";
import { ProvenanceChip, SectionTitle } from "@/components/provenance";
import { PARTNERS, PRODUCTS } from "@/core/catalog";
import { catalogFact } from "@/core/types";
import { PURPOSE_FA } from "@/core/labels";
import { faDays, faMonths, faPercent, formatTomanCompact, toPersianDigits } from "@/lib/money";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "شبکهٔ تأمین‌کنندگان — تسهیل‌رادار" },
      {
        name: "description",
        content:
          "شبکهٔ تأمین‌کنندگان تسهیل‌رادار: فهرست محصولات با قواعد شفاف و مشخص بودن اینکه هر عدد از کجا آمده است.",
      },
      { property: "og:title", content: "شبکهٔ تأمین‌کنندگان تسهیل‌رادار" },
      {
        property: "og:description",
        content: "قواعد شفاف محصولات و منبع هر عدد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PartnersPage,
});

const KIND_FA = {
  bank: "بانک",
  credit_institution: "مؤسسه اعتباری",
  fund: "صندوق",
  leasing: "لیزینگ",
  fintech: "فین‌تک",
} as const;

function PartnersPage() {
  const { state } = useSession();
  const [openId, setOpenId] = React.useState<string | null>(null);

  return (
    <AppShell className="space-y-5">
      <header className="surface-panel rounded-3xl p-5">
        <h1 className="text-lg font-bold">شبکهٔ تأمین‌کنندگان</h1>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          موتور استدلال تسهیل‌رادار روی همین مجموعه از محصولات اجرا می‌شود؛ قواعد هر محصول و منبع هر
          عدد شفاف است.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Tally value={PARTNERS.length} label="تأمین‌کننده" />
          <Tally value={PRODUCTS.length} label="محصول" />
          <Tally
            value={new Set(PRODUCTS.flatMap((p) => p.rules.allowedPurposes)).size}
            label="هدف پوشش‌داده‌شده"
          />
        </div>
        <div className="mt-3">
          <ProvenanceChip provenance={catalogFact(PRODUCTS[0].asOf)} />
        </div>
      </header>

      {PARTNERS.map((partner) => {
        const products = PRODUCTS.filter((p) => p.partnerId === partner.id);
        return (
          <section key={partner.id} className="rounded-3xl border border-border bg-surface p-4">
            <SectionTitle hint={`${toPersianDigits(products.length)} محصول`}>
              <span className="flex items-center gap-2">
                {partner.name}
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-normal text-muted-foreground">
                  {KIND_FA[partner.kind]}
                </span>
              </span>
            </SectionTitle>
            <ul className="space-y-2">
              {products.map((product) => {
                const open = openId === product.id;
                return (
                  <li key={product.id} className="rounded-2xl border border-border bg-elevated/50">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : product.id)}
                      className="flex w-full items-center justify-between gap-3 p-3 text-start"
                      aria-expanded={open}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{product.name}</span>
                        <span className="num mt-0.5 block text-[11px] text-muted-foreground">
                          {formatTomanCompact(product.rules.minAmount)} تا{" "}
                          {formatTomanCompact(product.rules.maxAmount)}
                        </span>
                      </span>
                      <span className="num shrink-0 text-xs text-signal">
                        {faPercent(product.ratePercent)}
                      </span>
                    </button>
                    {open ? (
                      <div className="border-t border-border p-3">
                        <p className="text-[11px] leading-5 text-muted-foreground">
                          {product.notes}
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <Cell label="حداکثر مدت" value={faMonths(product.maxTermMonths)} />
                          <Cell label="زمان معمول" value={faDays(product.typicalDays)} />
                          <Cell label="نرخ سالانه" value={faPercent(product.ratePercent)} />
                        </div>
                        <div className="mt-3 text-[10px] text-muted-foreground">
                          اهداف پذیرفته‌شده
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {product.rules.allowedPurposes.map((p) => (
                            <span
                              key={p}
                              className="rounded-full border border-border px-2 py-0.5 text-[10px]"
                            >
                              {PURPOSE_FA[p]}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <ProvenanceChip provenance={catalogFact(product.asOf)} />
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="rounded-3xl border border-border bg-surface p-4 text-center">
        <p className="text-xs text-muted-foreground">
          {Object.keys(state.slots).length > 0
            ? "می‌خواهی ببینی کدام‌یک از این مسیرها برای وضعیت تو باز مانده است؟"
            : "یک جمله بگو تا مشخص شود کدام‌یک از این مسیرها برای تو باز است."}
        </p>
        <Link
          to="/radar"
          className="mt-3 inline-block rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
        >
          دیدن رادار استدلال
        </Link>
      </div>
    </AppShell>
  );
}

function Tally({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated/50 p-2 text-center">
      <div className="num text-base font-extrabold text-foreground">{toPersianDigits(value)}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-2">
      <div className="num text-xs font-bold">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
