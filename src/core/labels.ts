import type {
  AdverseHistory,
  BankTurnover,
  Collateral,
  DebtLoad,
  Employment,
  Guarantor,
  IncomeBand,
  Purpose,
  ReadinessDimension,
  SlotKey,
  Urgency,
} from "./types";

export const PURPOSE_FA: Record<Purpose, string> = {
  business: "کسب‌وکار",
  home: "مسکن",
  car: "خودرو",
  personal: "نیاز شخصی",
  education: "تحصیل",
  debt: "تسویهٔ بدهی",
  marriage: "ازدواج",
  unknown: "نامشخص",
};

export const EMPLOYMENT_FA: Record<Employment, string> = {
  salaried: "حقوق‌بگیر",
  self_employed: "شغل آزاد",
  business_owner: "صاحب کسب‌وکار",
  retired: "بازنشسته",
  student: "دانشجو",
  unemployed: "بدون شغل",
  unknown: "نامشخص",
};

export const COLLATERAL_FA: Record<Collateral, string> = {
  property: "وثیقهٔ ملکی",
  vehicle: "وثیقهٔ خودرو",
  deposit: "سپردهٔ بانکی",
  none: "بدون وثیقه",
  unknown: "نامشخص",
};

export const GUARANTOR_FA: Record<Guarantor, string> = {
  payroll: "ضامن کارمند",
  business: "ضامن کاسب",
  none: "بدون ضامن",
  unknown: "نامشخص",
};

export const URGENCY_FA: Record<Urgency, string> = {
  immediate: "فوری",
  weeks: "چند هفته",
  flexible: "زمان‌بندی باز",
  unknown: "نامشخص",
};

export const INCOME_FA: Record<IncomeBand, string> = {
  under_20: "زیر ۲۰ میلیون تومان",
  "20_50": "۲۰ تا ۵۰ میلیون تومان",
  "50_100": "۵۰ تا ۱۰۰ میلیون تومان",
  over_100: "بیش از ۱۰۰ میلیون تومان",
  unknown: "نامشخص",
};

export const DEBT_FA: Record<DebtLoad, string> = {
  none: "بدون قسط",
  light: "زیر ۱۰ میلیون تومان",
  moderate: "۱۰ تا ۳۰ میلیون تومان",
  heavy: "بیشتر از ۳۰ میلیون تومان",
  unknown: "نامشخص",
};

export const TURNOVER_FA: Record<BankTurnover, string> = {
  under_50: "زیر ۵۰ میلیون تومان",
  "50_150": "۵۰ تا ۱۵۰ میلیون تومان",
  "150_300": "۱۵۰ تا ۳۰۰ میلیون تومان",
  over_300: "بیشتر از ۳۰۰ میلیون تومان",
  unknown: "نامشخص",
};

export const ADVERSE_FA: Record<AdverseHistory, string> = {
  none: "ندارم",
  resolved: "قبلاً داشتم و رفع شده",
  active: "در حال حاضر دارم",
  unsure: "مطمئن نیستم",
  unknown: "نامشخص",
};

export const SLOT_FA: Record<SlotKey, string> = {
  amount: "مبلغ",
  purpose: "هدف",
  employment: "وضعیت شغلی",
  collateral: "وثیقه",
  guarantor: "ضامن",
  incomeBand: "درآمد ماهانه",
  debtLoad: "اقساط و بدهی ماهانه",
  bankTurnover: "گردش حساب ماهانه",
  adverseHistory: "سابقهٔ چک یا بدهی معوق",
  urgency: "فوریت",
  region: "استان",
};

export const DIMENSION_FA: Record<ReadinessDimension, string> = {
  identity: "هویت و پروفایل",
  income: "ثبات درآمد",
  collateral: "وثیقه",
  guarantor: "ضامن",
  credit_signal: "سیگنال اعتباری",
  debt_load: "بار بدهی",
};

export const SOURCE_FA = {
  user_stated: "گفتهٔ شما",
  user_confirmed: "تأیید شما",
  provider_verified: "دادهٔ سرویس‌دهنده",
  catalog: "کاتالوگ محصولات",
  derived: "استنتاج موتور",
} as const;
