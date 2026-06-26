"use client"

import { useCountUp } from "@/hooks/use-count-up"
import { Reveal } from "./reveal"

const stats = [
  { value: 100, suffix: "%", label: "Traffic visibility", sub: "Kernel-level eBPF capture" },
  { value: 50, suffix: "+", label: "OWASP API tests", sub: "BOLA, BFLA, auth & more" },
  { value: 12, suffix: "M+", label: "Events / day", sub: "Per ingestion pipeline" },
  { value: 0, suffix: "", label: "Code changes", sub: "No SDKs or app agents" },
]

function Stat({ value, suffix, label, sub }: (typeof stats)[number]) {
  const { ref, value: shown } = useCountUp(value)
  return (
    <div className="text-center">
      <p className="text-4xl font-bold tracking-tight sm:text-5xl">
        <span ref={ref}>{shown}</span>
        <span className="text-primary">{suffix}</span>
      </p>
      <p className="mt-2 font-medium">{label}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
    </div>
  )
}

export function Stats() {
  return (
    <section className="section-glow relative border-y border-white/5 bg-white/[0.02] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
