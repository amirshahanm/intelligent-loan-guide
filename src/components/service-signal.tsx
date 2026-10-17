import { useId } from "react";

/** Decorative route signal: never represents a financial score or live scan. */
export function ServiceSignal({ variant }: { variant: "trade" | "market" }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="service-signal" aria-hidden="true">
      <svg viewBox="0 0 320 320" focusable="false">
        <defs>
          <radialGradient id={`${id}-fill`}>
            <stop stopColor="#20cdbb" stopOpacity=".18" />
            <stop offset="1" stopColor="#071322" stopOpacity=".1" />
          </radialGradient>
          <linearGradient id={`${id}-sweep`} x2="1" y2="1">
            <stop stopColor="#35f3de" stopOpacity=".65" />
            <stop offset="1" stopColor="#35f3de" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="160" cy="160" r="138" fill={`url(#${id}-fill)`} />
        {[45, 75, 105, 138].map((r) => (
          <circle key={r} cx="160" cy="160" r={r} fill="none" stroke="currentColor" opacity=".22" />
        ))}
        <path d="M22 160H298M160 22V298" stroke="currentColor" opacity=".12" />
        <g className="service-signal__sweep">
          <path d="M160 160L160 22A138 138 0 0 1 280 91Z" fill={`url(#${id}-sweep)`} />
        </g>
        {variant === "trade" ? (
          <path
            d="M65 185Q110 80 160 160T255 105M65 185Q175 275 255 105"
            stroke="currentColor"
            fill="none"
            strokeDasharray="4 7"
            opacity=".7"
          />
        ) : null}
        {[
          [65, 185],
          [110, 95],
          [160, 160],
          [215, 225],
          [255, 105],
        ].map(([x, y], i) => (
          <g key={i} className="service-signal__node" style={{ animationDelay: `${i * 0.4}s` }}>
            <circle cx={x} cy={y} r="10" fill="currentColor" opacity=".1" />
            <circle cx={x} cy={y} r="3" fill="currentColor" />
          </g>
        ))}
      </svg>
    </div>
  );
}
