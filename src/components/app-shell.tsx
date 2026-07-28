import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { anyMock } from "@/lib/providers";

const NAV = [
  { to: "/", label: "شروع" },
  { to: "/radar", label: "رادار" },
  { to: "/opportunities", label: "فرصت‌ها" },
  { to: "/credit", label: "اعتبارسنجی" },
  { to: "/partners", label: "شبکه" },
  { to: "/profile", label: "پرونده" },
] as const;


export function DemoBanner() {
  if (!anyMock) return null;
  return (
    <div className="border-b border-border bg-elevated/60 px-4 py-2 text-center text-[11px] leading-5 text-muted-foreground">
      نسخهٔ نمایشی — همهٔ داده‌های محصول، اعتبارسنجی و بازار{" "}
      <span className="font-semibold text-warn">شبیه‌سازی‌شده</span> است. هیچ استعلام واقعی، نرخ
      واقعی یا نام مؤسسهٔ واقعی در این نسخه ارائه نمی‌شود.
    </div>
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

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <RadarMark />
            <span className="text-base font-bold tracking-tight">تسهیل‌رادار</span>
          </Link>
          <nav className="ms-auto flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors",
                  pathname === item.to
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-elevated hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className={cn("mx-auto max-w-6xl px-4 pb-24 pt-6", className)}>{children}</main>
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
