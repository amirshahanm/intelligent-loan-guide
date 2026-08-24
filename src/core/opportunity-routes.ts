import type { IntentSlots, IRR, Purpose } from "./types";

export type ProductWorld = "money" | "buy" | "business" | "trade";

export type CapabilityStatus =
  | "ACTIVE"
  | "COMING_SOON"
  | "PARTNER_REQUIRED"
  | "LICENSE_REQUIRED";

export type NeedKind =
  | "cash"
  | "purchase_vehicle"
  | "purchase_property"
  | "purchase_goods"
  | "working_capital"
  | "equipment"
  | "trade_import"
  | "trade_export"
  | "unknown";

export type RouteKind =
  | "cash_facility"
  | "installment_purchase"
  | "leasing"
  | "working_capital"
  | "equipment_finance"
  | "property_finance"
  | "trade_intelligence"
  | "trade_finance";

export type UniversalNeed = {
  kind: NeedKind;
  targetAmount?: IRR;
  source: "legacy_slots" | "ai_structured" | "user_selected";
  confidence: number;
};

export type OpportunityRouteFamily = {
  id: string;
  world: ProductWorld;
  kind: RouteKind;
  titleFa: string;
  summaryFa: string;
  capabilityStatus: CapabilityStatus;
  supportedNeeds: NeedKind[];
  /** True while this route exists as product architecture/demo, not live execution. */
  demo?: true;
  /** Non-live areas should still create a useful structured demand signal. */
  canCaptureDemand: boolean;
};

export type RouteFamilyMatch = {
  route: OpportunityRouteFamily;
  score: number;
  reasonFa: string;
};

const ROUTE_FAMILIES: OpportunityRouteFamily[] = [
  {
    id: "money_cash_facility",
    world: "money",
    kind: "cash_facility",
    titleFa: "مسیر نقدینگی و تسهیلات",
    summaryFa: "بررسی مسیرهای وام، اعتبار و نقدینگی بر اساس شرایط واقعی کاربر.",
    capabilityStatus: "PARTNER_REQUIRED",
    supportedNeeds: ["cash", "working_capital", "purchase_vehicle", "purchase_property", "unknown"],
    demo: true,
    canCaptureDemand: true,
  },
  {
    id: "buy_vehicle_finance",
    world: "buy",
    kind: "leasing",
    titleFa: "خرید اقساطی و تأمین مالی خودرو",
    summaryFa: "ترکیب فروشنده، پیش‌پرداخت، تأمین مالی، تضامین و شرایط تحویل در یک مسیر قابل اجرا.",
    capabilityStatus: "PARTNER_REQUIRED",
    supportedNeeds: ["purchase_vehicle"],
    demo: true,
    canCaptureDemand: true,
  },
  {
    id: "buy_general_installment",
    world: "buy",
    kind: "installment_purchase",
    titleFa: "خرید اعتباری کالا و خدمات",
    summaryFa: "مقایسه مسیرهای خرید اقساطی بر مبنای توان پرداخت، شرایط اعتبار و فروشنده.",
    capabilityStatus: "PARTNER_REQUIRED",
    supportedNeeds: ["purchase_goods"],
    demo: true,
    canCaptureDemand: true,
  },
  {
    id: "buy_property_finance",
    world: "buy",
    kind: "property_finance",
    titleFa: "مسیر خرید و تأمین مالی ملک",
    summaryFa: "Foundation توسعه‌پذیر برای خریدهای بزرگ ملکی بدون ادعای اتصال عملیاتی فعلی.",
    capabilityStatus: "PARTNER_REQUIRED",
    supportedNeeds: ["purchase_property"],
    demo: true,
    canCaptureDemand: true,
  },
  {
    id: "business_working_capital",
    world: "business",
    kind: "working_capital",
    titleFa: "سرمایه در گردش کسب‌وکار",
    summaryFa: "مسیرهای تأمین نقدینگی متناسب با گردش، وضعیت فعالیت و نیاز اجرایی کسب‌وکار.",
    capabilityStatus: "PARTNER_REQUIRED",
    supportedNeeds: ["working_capital"],
    demo: true,
    canCaptureDemand: true,
  },
  {
    id: "business_equipment_finance",
    world: "business",
    kind: "equipment_finance",
    titleFa: "تأمین مالی تجهیزات",
    summaryFa: "خرید یا تأمین مالی تجهیزات با ساختار قابل اتصال به فروشنده و تأمین‌کننده اعتبار.",
    capabilityStatus: "PARTNER_REQUIRED",
    supportedNeeds: ["equipment"],
    demo: true,
    canCaptureDemand: true,
  },
  {
    id: "trade_opportunity_intelligence",
    world: "trade",
    kind: "trade_intelligence",
    titleFa: "رادار فرصت تجارت",
    summaryFa: "ثبت تقاضا و تحلیل اولیه فرصت واردات/صادرات پیش از هر تعهد اجرایی یا خرید موجودی.",
    capabilityStatus: "COMING_SOON",
    supportedNeeds: ["trade_import", "trade_export"],
    demo: true,
    canCaptureDemand: true,
  },
  {
    id: "trade_finance",
    world: "trade",
    kind: "trade_finance",
    titleFa: "تأمین مالی تجارت",
    summaryFa: "مسیر معماری برای تأمین مالی تجارت که اجرای واقعی آن وابسته به شریک و مجوزهای لازم است.",
    capabilityStatus: "LICENSE_REQUIRED",
    supportedNeeds: ["trade_import", "trade_export"],
    demo: true,
    canCaptureDemand: true,
  },
];

export function listRouteFamilies(): OpportunityRouteFamily[] {
  return ROUTE_FAMILIES.map((route) => ({ ...route, supportedNeeds: [...route.supportedNeeds] }));
}

function legacyPurposeToNeed(purpose: Purpose | undefined): NeedKind {
  switch (purpose) {
    case "car":
      return "purchase_vehicle";
    case "home":
      return "purchase_property";
    case "business":
      return "working_capital";
    case "personal":
    case "education":
    case "debt":
    case "marriage":
      return "cash";
    case "unknown":
    case undefined:
      return "unknown";
  }
}

/**
 * Adapter from the approved legacy loan intent model into the broader route
 * model. This lets the platform evolve without rewriting Eligibility/Match.
 */
export function universalNeedFromLegacySlots(slots: IntentSlots): UniversalNeed {
  const purpose = slots.purpose?.value;
  const kind = legacyPurposeToNeed(purpose);
  return {
    kind,
    targetAmount: slots.amount?.value,
    source: "legacy_slots",
    confidence: kind === "unknown" ? 0.35 : 0.8,
  };
}

function scoreRoute(route: OpportunityRouteFamily, need: UniversalNeed): number {
  if (!route.supportedNeeds.includes(need.kind)) return 0;

  let score = 70;

  if (need.kind === "purchase_vehicle" && route.id === "buy_vehicle_finance") score = 100;
  else if (need.kind === "purchase_property" && route.id === "buy_property_finance") score = 100;
  else if (need.kind === "working_capital" && route.id === "business_working_capital") score = 100;
  else if (need.kind === "purchase_goods" && route.id === "buy_general_installment") score = 100;
  else if (
    (need.kind === "trade_import" || need.kind === "trade_export") &&
    route.id === "trade_opportunity_intelligence"
  )
    score = 100;
  else if (need.kind === "cash" && route.id === "money_cash_facility") score = 100;
  else if (route.world === "money") score = 64;

  return Math.round(score * Math.max(0.5, need.confidence));
}

function routeReason(route: OpportunityRouteFamily, need: UniversalNeed): string {
  if (route.world === "buy" && need.kind === "purchase_vehicle")
    return "نیاز کاربر خرید خودرو است؛ مسیر خرید + تأمین مالی باید قبل از وام نقدی بررسی شود.";
  if (route.world === "business")
    return "نیاز به کسب‌وکار مربوط است و باید مسیر سرمایه/تجهیزات از وام شخصی جدا ارزیابی شود.";
  if (route.world === "trade")
    return "این نیاز ماهیت تجاری دارد و قبل از اجرا به تحلیل فرصت، شریک و وضعیت مجوز وابسته است.";
  if (route.world === "money")
    return "مسیر نقدینگی می‌تواند به‌عنوان مسیر اصلی یا جایگزین مالی بررسی شود.";
  return "این مسیر با نوع نیاز ثبت‌شده سازگار است.";
}

export function discoverRouteFamilies(need: UniversalNeed): RouteFamilyMatch[] {
  return ROUTE_FAMILIES.map((route) => ({
    route,
    score: scoreRoute(route, need),
    reasonFa: routeReason(route, need),
  }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.route.id.localeCompare(b.route.id));
}
