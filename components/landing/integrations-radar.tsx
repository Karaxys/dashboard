import { ShieldHalf, Siren, Workflow, Bell, Cloud, Database } from "lucide-react"

const orbit = [
  { icon: Siren, label: "Splunk", angle: -90 },
  { icon: Workflow, label: "Tines", angle: -30 },
  { icon: Bell, label: "Slack", angle: 30 },
  { icon: Cloud, label: "AWS", angle: 90 },
  { icon: Database, label: "Elastic", angle: 150 },
  { icon: Workflow, label: "GitHub", angle: 210 },
]

const RADIUS = 150

export function IntegrationsRadar() {
  return (
    <div className="relative mx-auto mt-14 aspect-square w-full max-w-md">
      {/* Sonar rings */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="sonar-ring absolute inset-0 rounded-full border border-primary/30"
          style={{ "--ring-delay": `${i * 1.15}s` } as React.CSSProperties}
        />
      ))}
      {/* Static guide rings */}
      <span className="absolute inset-[12%] rounded-full border border-white/5" />
      <span className="animate-spin-slow absolute inset-[24%] rounded-full border border-dashed border-white/10" />

      {/* Core */}
      <div className="absolute left-1/2 top-1/2 flex size-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-primary/40 bg-background/70 backdrop-blur-xl">
        <ShieldHalf className="size-7 text-primary" />
        <span className="mt-1 text-xs font-semibold">Karaxys</span>
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
            <div className="glass-panel flex items-center gap-2 rounded-full border px-3 py-1.5">
              <item.icon className="size-3.5 text-primary" />
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
