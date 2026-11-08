import { Link } from "@tanstack/react-router";
import { ArrowLeft, Calculator, MessageSquareText, Route as RouteIcon, Rocket } from "lucide-react";
import { SHAHAN_AUTO_INSTALLMENT_TERMS as TERMS } from "@/lib/partners/shahan-auto";
import { toDisplayDigits } from "@/lib/money";

const STEPS = [
  {
    icon: MessageSquareText,
    title: "بگو",
    text: "نیازت را با زبان خودت بنویس یا بگو؛ بدون ثبت‌نام.",
  },
  {
    icon: RouteIcon,
    title: "ببین",
    text: "مسیرهای واقعی را با دلیل و محاسبهٔ شفاف کنار هم ببین.",
  },
  {
    icon: Rocket,
    title: "اقدام کن",
    text: "قدم بعدی روشن است؛ هر جا لازم شد، کارشناس همراهت می‌شود.",
  },
] as const;

export function HomeJourney() {
  return (
    <section className="home-journey" aria-labelledby="home-journey-title">
      <h2 id="home-journey-title">تسهیل‌رادار چطور کار می‌کند؟</h2>
      <ol className="home-journey__steps">
        {STEPS.map(({ icon: Icon, title, text }, index) => (
          <li key={title} style={{ "--step": index } as React.CSSProperties}>
            <span className="home-journey__icon">
              <Icon aria-hidden="true" strokeWidth={1.6} />
            </span>
            <strong>{title}</strong>
            <p>{text}</p>
          </li>
        ))}
      </ol>

      <Link to="/vehicle" hash="vehicle-calculator" className="home-journey__calc">
        <span className="home-journey__calc-icon">
          <Calculator aria-hidden="true" />
        </span>
        <span>
          <strong>قسط ماشینت را همین الان ببین</strong>
          <small>
            {toDisplayDigits(TERMS.minDownPaymentPercent)}٪ نقد، باقی تا{" "}
            {toDisplayDigits(TERMS.maxMonths)} ماه با چک یا سفته؛ بدون ضامن
          </small>
        </span>
        <ArrowLeft aria-hidden="true" className="home-journey__calc-arrow" />
      </Link>
    </section>
  );
}
