import { ShieldHalf, Siren, Workflow, Bell, Cloud, Database } from "lucide-react"

const orbit = [
  { icon: Siren,    label: "Splunk",  angle: -90 },
  { icon: Workflow, label: "Tines",   angle: -30 },
  { icon: Bell,     label: "Slack",   angle: 30 },
  { icon: Cloud,    label: "AWS",     angle: 90 },
  { icon: Database, label: "Elastic", angle: 150 },
  { icon: Workflow, label: "GitHub",  angle: 210 },
]

const RADIUS = 210

export function IntegrationsRadar() {
  return (
    <div className="relative mx-auto mt-14 aspect-square w-full max-w-2xl">
      {/* Amber radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "200%",
          height: "200%",
          background: [
            "radial-gradient(circle, oklch(0.62 0.20 72 / 0.40) 0%, oklch(0.50 0.16 70 / 0.15) 38%, transparent 62%)",
            "radial-gradient(circle, oklch(0.70 0.22 75 / 0.30) 0%, transparent 35%)",
          ].join(", "),
        }}
        aria-hidden
      />

      {/* Static dashed guide rings — amber */}
      {[0.95, 0.78, 0.62, 0.46, 0.30].map((scale, i) => (
        <span
          key={i}
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-amber-500/18"
          style={{
            width: `${scale * 100}%`,
            height: `${scale * 100}%`,
            opacity: 0.35 + i * 0.13,
          }}
          aria-hidden
        />
      ))}

      {/* Animated sonar rings — amber */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="sonar-ring absolute inset-[18%] rounded-full border border-amber-400/55"
          style={{ "--ring-delay": `${i * 1.15}s` } as React.CSSProperties}
        />
      ))}

      {/* Slow-spinning dashed ring */}
      <span className="animate-spin-slow absolute inset-[20%] rounded-full border border-dashed border-amber-400/25" />

      {/* Core circle */}
      <div
        className="absolute left-1/2 top-1/2 flex size-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-amber-400/60 bg-slate-950/90 backdrop-blur-xl"
        style={{ boxShadow: "0 0 56px -8px oklch(0.55 0.16 70 / 0.55)" }}
      >
        <ShieldHalf className="size-8 text-amber-400" />
        <span className="mt-1 text-xs font-semibold text-slate-100">Karaxys</span>
      </div>

      {/* Orbiting integration chips */}
      {orbit.map((item) => {
        const rad = (item.angle * Math.PI) / 180
        const x = Math.cos(rad) * RADIUS
        const y = Math.sin(rad) * RADIUS
        return (
          <div
            key={item.label}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
          >
            <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-slate-950/90 px-4 py-2 backdrop-blur-md">
              <item.icon className="size-3.5 text-amber-400" />
              <span className="text-xs font-medium text-slate-200">{item.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
