import { Reveal } from "./reveal"

const stats = [
  { value: "100%", label: "Traffic visibility",  sub: "Kernel-level eBPF capture" },
  { value: "50+",  label: "OWASP API tests",     sub: "BOLA, BFLA, auth & more" },
  { value: "12M+", label: "Events / day",        sub: "Per ingestion pipeline" },
  { value: "0",    label: "Code changes",        sub: "No SDKs or app agents" },
]

export function Stats() {
  return (
    <section className="bg-slate-950/30 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid grid-cols-2 gap-10 text-center lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-4xl font-bold text-amber-400 sm:text-5xl">{s.value}</p>
                <p className="mt-2 font-semibold text-slate-100">{s.label}</p>
                <p className="mt-0.5 text-sm text-slate-500">{s.sub}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
