import * as React from "react";
import { ClipboardCheck, Handshake, Heart, Landmark, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type HomeRadarServiceId = "credit" | "bank" | "trade" | "marriage" | "mobile";

type RadarPhase = "scan" | "detect" | "connect" | "resolve" | "execute";

const PHASES: ReadonlyArray<{
  id: RadarPhase;
  english: string;
  label: string;
  description: string;
}> = [
  {
    id: "scan",
    english: "Scan",
    label: "اسکن نیاز",
    description: "نیازت را بنویس یا یک سرویس را انتخاب کن.",
  },
  {
    id: "detect",
    english: "Detect",
    label: "تشخیص حوزه",
    description: "انتخاب تو دریافت شد و حوزهٔ مرتبط مشخص است.",
  },
  {
    id: "connect",
    english: "Connect",
    label: "اتصال مسیرها",
    description: "مسیرهای مرتبط برای بررسی کنار هم قرار گرفتند.",
  },
  {
    id: "resolve",
    english: "Resolve",
    label: "جمع‌بندی داده‌ها",
    description: "داده‌های واردشده برای تصمیم بعدی مرتب شدند.",
  },
  {
    id: "execute",
    english: "Execute",
    label: "آمادهٔ ادامه",
    description: "گام بعدی بر پایهٔ اطلاعات خودت آماده است؛ نه یک تأیید مالی.",
  },
];

const RADAR_SERVICES = [
  { id: "credit", label: "اعتبارسنجی", icon: ClipboardCheck },
  { id: "bank", label: "وام‌های بانکی", icon: Landmark },
  { id: "trade", label: "تجارت بین‌الملل", icon: Handshake },
  { id: "marriage", label: "وام ازدواج", icon: Heart },
  { id: "mobile", label: "خرید موبایل", icon: Smartphone },
] as const;

const RADAR_NODES = [
  { cx: 160, cy: 62 },
  { cx: 244, cy: 102 },
  { cx: 244, cy: 218 },
  { cx: 76, cy: 218 },
  { cx: 76, cy: 102 },
  { cx: 62, cy: 160 },
  { cx: 258, cy: 160 },
] as const;

const SERVICE_NODE: Record<HomeRadarServiceId, number> = {
  bank: 0,
  trade: 1,
  mobile: 2,
  marriage: 3,
  credit: 4,
};

const SWEEP_SLICES = Array.from({ length: 48 }, (_, index) => {
  const start = ((index - 48) * 1.25 * Math.PI) / 180;
  const end = ((index - 47) * 1.25 * Math.PI) / 180;
  const point = (angle: number) =>
    `${(160 + Math.cos(angle) * 148).toFixed(3)} ${(160 + Math.sin(angle) * 148).toFixed(3)}`;
  return {
    path: `M160 160L${point(start)}A148 148 0 0 1 ${point(end)}Z`,
    opacity: 0.025 + ((index + 1) / 48) ** 2 * 0.88,
  };
});

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return reduced;
}

export function HomeRadar({
  selectedService,
  selectedLabel,
  activityKey,
  active,
  onSelectService,
}: {
  selectedService: HomeRadarServiceId;
  selectedLabel: string;
  activityKey: string;
  active: boolean;
  onSelectService: (service: HomeRadarServiceId, label: string) => void;
}) {
  const [phaseIndex, setPhaseIndex] = React.useState(0);
  const reducedMotion = usePrefersReducedMotion();

  React.useEffect(() => {
    if (!active) {
      setPhaseIndex(0);
      return;
    }

    if (reducedMotion) {
      setPhaseIndex(PHASES.length - 1);
      return;
    }

    setPhaseIndex(0);
    const timers = [
      window.setTimeout(() => setPhaseIndex(1), 520),
      window.setTimeout(() => setPhaseIndex(2), 1120),
      window.setTimeout(() => setPhaseIndex(3), 1780),
      window.setTimeout(() => setPhaseIndex(4), 2480),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [active, activityKey, reducedMotion]);

  const phase = PHASES[phaseIndex];
  const selectedNodeIndex = SERVICE_NODE[selectedService];
  const selectedNode = RADAR_NODES[selectedNodeIndex];
  const bearing = (Math.atan2(selectedNode.cy - 160, selectedNode.cx - 160) * 180) / Math.PI;
  const svgId = React.useId().replace(/:/g, "");

  return (
    <section className="home-radar-section" aria-labelledby="home-radar-title">
      <h2 id="home-radar-title" className="sr-only">
        رادار تعاملی انتخاب مسیر
      </h2>

      <div className="home-radar-stage">
        {RADAR_SERVICES.map((service) => {
          const Icon = service.icon;
          const selected = service.id === selectedService;
          return (
            <button
              key={service.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectService(service.id, service.label)}
              className={cn(
                "home-radar-service",
                `home-radar-service--${service.id}`,
                selected && "is-selected",
              )}
            >
              <span className="home-radar-service__icon">
                <Icon aria-hidden="true" focusable="false" strokeWidth={1.5} />
              </span>
              <span>{service.label}</span>
            </button>
          );
        })}

        <div
          className={cn("home-radar", `is-${phase.id}`)}
          data-phase={phase.id}
          data-service={selectedService}
          style={{ "--radar-bearing": `${bearing}deg` } as React.CSSProperties}
        >
          <div className="home-radar__glow" aria-hidden="true" />
          <svg
            className="home-radar__svg"
            viewBox="0 0 320 320"
            role="img"
            aria-label={`رادار در حالت ${phase.label} برای ${selectedLabel}؛ نمایش انتخاب مسیر، نه نتیجهٔ مالی`}
          >
            <defs>
              <radialGradient id={`${svgId}-beam`}>
                <stop offset="0" stopColor="currentColor" stopOpacity="0.2" />
                <stop offset="0.75" stopColor="currentColor" stopOpacity="0.55" />
                <stop offset="1" stopColor="currentColor" />
              </radialGradient>
              <radialGradient id={`${svgId}-lens`}>
                <stop offset="0" stopColor="currentColor" stopOpacity="0.14" />
                <stop offset="0.55" stopColor="currentColor" stopOpacity="0.02" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.08" />
              </radialGradient>
            </defs>
            <circle cx="160" cy="160" r="148" fill={`url(#${svgId}-lens)`} />
            <circle cx="160" cy="160" r="158" className="home-radar__halo" />
            <circle cx="160" cy="160" r="148" className="home-radar__edge" />
            {[28, 58, 88, 118, 138].map((radius) => (
              <circle key={radius} cx="160" cy="160" r={radius} className="home-radar__ring" />
            ))}
            <path d="M160 12V308M12 160H308" className="home-radar__axis" />
            <path d="M54 54L266 266M266 54L54 266" className="home-radar__axis is-diagonal" />
            <circle cx="160" cy="160" r="152" className="home-radar__ticks" />
            <g className="home-radar__sweep" aria-hidden="true">
              {SWEEP_SLICES.map((slice, index) => (
                <path
                  key={index}
                  d={slice.path}
                  fill={`url(#${svgId}-beam)`}
                  opacity={slice.opacity}
                />
              ))}
              <path d="M160 160H308" className="home-radar__beam" />
              <path d="M234 32A148 148 0 0 1 308 160" className="home-radar__rim-light" />
            </g>
            <g className="home-radar__routes" aria-hidden="true">
              <path d={`M160 160L${selectedNode.cx} ${selectedNode.cy}`} />
              <path d="M160 62L244 102L244 218L76 218L76 102Z" className="home-radar__network" />
            </g>
            <g className="home-radar__nodes" aria-hidden="true">
              {RADAR_NODES.map((node, index) => (
                <circle
                  key={`${node.cx}-${node.cy}`}
                  cx={node.cx}
                  cy={node.cy}
                  r={index === selectedNodeIndex ? 3.8 : 2.5}
                  className={index === selectedNodeIndex ? "is-target" : undefined}
                  style={{ "--node-index": index } as React.CSSProperties}
                />
              ))}
            </g>
            <circle
              cx={selectedNode.cx}
              cy={selectedNode.cy}
              r="11"
              className="home-radar__target"
              aria-hidden="true"
            />
            <circle cx="160" cy="160" r="17" className="home-radar__origin-halo" />
            <circle cx="160" cy="160" r="6" className="home-radar__center" />
          </svg>

          <div className="sr-only" aria-live="polite" aria-atomic="true">
            <strong>{phase.label}</strong>
            <span className="home-radar__selection">{selectedLabel}</span>
          </div>
        </div>
      </div>

      <div className="home-radar-state" role="group" aria-label="حالت‌های رادار">
        {PHASES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={cn("home-radar-state__step", index <= phaseIndex && "is-reached")}
            aria-pressed={index === phaseIndex}
            aria-label={item.label}
            title={item.label}
            onClick={() => setPhaseIndex(index)}
          >
            <span />
          </button>
        ))}
      </div>
      <p className="home-radar-state__description">
        <strong>{phase.label}</strong> · {phase.description}
      </p>
    </section>
  );
}
