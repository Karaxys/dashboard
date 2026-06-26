import { Radar, Globe, FileCode, ShieldHalf, Boxes, Siren, FileText } from "lucide-react"

const sources = [
  { icon: Radar, label: "eBPF capture agent" },
  { icon: Globe, label: "Active URL crawls" },
  { icon: FileCode, label: "OpenAPI / HAR import" },
]

const outputs = [
  { icon: Boxes, label: "API inventory" },
  { icon: Siren, label: "Findings & issues" },
  { icon: FileText, label: "SIEM / SOAR feeds" },
]

function Node({ icon: Icon, label }: { icon: typeof Radar; label: string }) {
  return (
    <div className="glass-panel flex items-center gap-3 rounded-xl border px-4 py-3">
      <span className="glass-chip flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4 text-primary" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

// Horizontal connector with dots flowing left-to-right through the pipeline.
function Connector() {
  return (
    <div className="relative hidden h-px flex-1 self-center bg-linear-to-r from-white/5 via-white/20 to-white/5 lg:block">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="flow-x absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_8px_2px_rgba(56,189,248,0.6)]"
          style={{ "--flow-delay": `${i * 0.9}s`, "--flow-dur": "2.7s" } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

export function Pipeline() {
  return (
    <div className="mt-14 flex flex-col gap-8 lg:flex-row lg:items-center">
      {/* Sources */}
      <div className="space-y-3 lg:w-64 lg:shrink-0">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground lg:text-left">
          01 · Capture
        </p>
        {sources.map((s) => (
          <Node key={s.label} {...s} />
        ))}
      </div>

      <Connector />

      {/* Core */}
      <div className="flex flex-col items-center gap-3 lg:shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">02 · Analyze</p>
        <div className="relative flex size-36 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="sonar-ring absolute inset-0 rounded-full border border-primary/40"
              style={{ "--ring-delay": `${i * 1.1}s` } as React.CSSProperties}
            />
          ))}
          <div className="glass-panel relative flex size-24 flex-col items-center justify-center rounded-full border border-primary/30 text-center">
            <ShieldHalf className="size-7 text-primary" />
            <span className="mt-1 text-xs font-semibold">Karaxys</span>
            <span className="text-[10px] text-muted-foreground">core</span>
          </div>
        </div>
        <p className="max-w-[12rem] text-center text-xs text-muted-foreground">
          Redact, normalize, learn schemas, score risk, and test continuously.
        </p>
      </div>

      <Connector />

      {/* Outputs */}
      <div className="space-y-3 lg:w-64 lg:shrink-0">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground lg:text-right">
          03 · Act
        </p>
        {outputs.map((o) => (
          <Node key={o.label} {...o} />
        ))}
      </div>
    </div>
  )
}
