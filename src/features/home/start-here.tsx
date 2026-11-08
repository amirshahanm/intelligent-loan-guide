import { Link } from "@tanstack/react-router";
import { Briefcase, Car, Globe2, HandCoins, ShieldCheck, ShoppingBag } from "lucide-react";
import { ConciergeExperience } from "@/features/concierge/concierge-experience";
import { HomeJourney } from "@/features/home/home-journey";

const WORLDS = [
  { to: "/vehicle", label: "خرید خودرو", icon: Car },
  { to: "/goods", label: "خرید کالا", icon: ShoppingBag },
  { to: "/finance/$service", service: "cash-loan", label: "وام نقدی", icon: HandCoins },
  {
    to: "/finance/$service",
    service: "working-capital",
    label: "سرمایهٔ کسب‌وکار",
    icon: Briefcase,
  },
  { to: "/trade", label: "واردات و صادرات", icon: Globe2 },
  { to: "/credit", label: "اعتبارسنجی", icon: ShieldCheck },
] as const;

/** Replaces dead-end empty states: start the conversation right here. */
export function StartHere({ title, text }: { title: string; text: string }) {
  return (
    <div className="start-here">
      <section className="start-here__hero" aria-labelledby="start-here-title">
        <span className="start-here__pulse" aria-hidden="true" />
        <h1 id="start-here-title">{title}</h1>
        <p>{text}</p>
      </section>
      <ConciergeExperience suggestionLabel="" />
      <nav className="start-here__worlds" aria-label="شروع از یک مسیر">
        {WORLDS.map((world) => {
          const Icon = world.icon;
          const params = "service" in world ? { service: world.service } : undefined;
          return (
            <Link key={world.label} to={world.to} params={params as never}>
              <Icon aria-hidden="true" strokeWidth={1.6} />
              <span>{world.label}</span>
            </Link>
          );
        })}
      </nav>
      <HomeJourney />
    </div>
  );
}
