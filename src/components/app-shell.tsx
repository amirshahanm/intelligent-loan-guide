import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Folder, Headphones, House, Radar, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "خانه", icon: House },
  { to: "/radar", label: "رادار", icon: Radar },
  { to: "/opportunities", label: "فرصت‌ها", icon: Star },
  { to: "/profile", label: "پرونده من", icon: Folder },
  { to: "/support", label: "پشتیبانی", icon: Headphones },
] as const;

function isActiveRoute(pathname: string, to: string) {
  if (to === "/" && pathname.startsWith("/finance/")) return true;
  if (to === "/")
    return ["/", "/vehicle", "/goods", "/credit", "/trade", "/bank-credit"].includes(pathname);
  if (to === "/opportunities") {
    return pathname === to || pathname === "/partners" || pathname.startsWith("/opportunity/");
  }
  if (to === "/profile")
    return pathname === to || pathname === "/readiness" || pathname.startsWith("/handoff/");
  return pathname === to;
}

function ShellNavigation({ pathname, mobile = false }: { pathname: string; mobile?: boolean }) {
  return (
    <nav
      aria-label={mobile ? "ناوبری اصلی موبایل" : "ناوبری اصلی"}
      className={mobile ? "mobile-bottom-nav__items" : "desktop-shell-nav"}
    >
      {NAV.map((item) => {
        const Icon = item.icon;
        const disabled = "disabled" in item && item.disabled;
        const active = "to" in item ? isActiveRoute(pathname, item.to) : false;
        const content = (
          <>
            <Icon aria-hidden="true" strokeWidth={active ? 2.1 : 1.65} />
            <span>{item.label}</span>
          </>
        );

        if (disabled) {
          return (
            <span
              key={item.label}
              className={cn(
                mobile ? "mobile-bottom-nav__item" : "desktop-shell-nav__item",
                "cursor-not-allowed opacity-65",
              )}
              role="link"
              aria-disabled="true"
              title="صفحه پشتیبانی در فاز مربوط به خود فعال می‌شود"
            >
              {content}
            </span>
          );
        }

        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={cn(
              mobile ? "mobile-bottom-nav__item" : "desktop-shell-nav__item",
              active && (mobile ? "is-active" : "is-active"),
            )}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  const parent = pathname.startsWith("/opportunity/")
    ? { to: "/opportunities" as const, label: "فرصت‌ها" }
    : pathname.startsWith("/handoff/") || pathname === "/readiness"
      ? { to: "/profile" as const, label: "پرونده من" }
      : { to: "/" as const, label: "خانه" };

  return (
    <div
      className={cn(
        "app-shell min-h-screen bg-background",
        isHome ? "app-shell--home" : "app-shell--interior",
      )}
    >
      <header className="app-shell__header">
        <div className="app-shell__header-inner">
          <span className="app-shell__founder" dir="ltr">
            Founded by Shahan
          </span>
          <ShellNavigation pathname={pathname} />
          <Link to="/" className="app-shell__brand" aria-label="تسهیل‌رادار، خانه">
            <span>تسهیل</span>
            <span className="text-accent">رادار</span>
          </Link>
        </div>
      </header>
      {!isHome ? (
        <div className="app-shell__context">
          <Link to={parent.to} className="app-shell__back">
            <ArrowRight aria-hidden="true" />
            <span>بازگشت به {parent.label}</span>
          </Link>
        </div>
      ) : null}
      <main className={cn("app-shell__main", className)}>{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-5 pb-28 pt-8 text-sm text-muted-foreground md:pb-10">
        <details className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
          <summary className="cursor-pointer text-foreground">درباره ما و مجوزها</summary>
          <div className="mt-4 space-y-4 leading-7">
            <p>
              تسهیل‌رادار برای روشن‌تر شدن مسیر تأمین مالی و بررسی نیازهای شما طراحی شده است. نمایش
              مسیر پیشنهادی به معنی تأیید اعتبار یا تضمین دریافت تسهیلات نیست.
            </p>
            <Link to="/support" className="inline-flex text-accent underline underline-offset-4">
              ارتباط با پشتیبانی
            </Link>
            <section aria-label="مجوزها و نشان‌های قابل استعلام">
              <h2 className="mb-3 text-foreground">مجوزها و نشان‌ها</h2>
              <div
                id="verified-license-badges"
                className="min-h-24 rounded-xl border border-dashed border-white/15 p-4"
              >
                <p>هنوز نشان یا مجوز تأییدشده‌ای در این بخش نصب نشده است.</p>
              </div>
            </section>
          </div>
        </details>
      </footer>
      <div className="mobile-bottom-nav">
        <ShellNavigation pathname={pathname} mobile />
      </div>
    </div>
  );
}

export function RadarMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-7 items-center justify-center rounded-full border border-accent/40",
        className,
      )}
    >
      <span className="absolute inset-1 rounded-full border border-accent/25" />
      <span className="size-1.5 rounded-full bg-accent anim-pulse-node" />
    </span>
  );
}
