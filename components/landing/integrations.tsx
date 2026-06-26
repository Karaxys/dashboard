import { Plug, Siren, Workflow, Cloud, Bell } from "lucide-react"
import { Section, SectionHeading } from "./section"
import { Reveal } from "./reveal"
import { IntegrationsRadar } from "./integrations-radar"

const groups = [
  { icon: Siren, title: "SIEM & detection", items: ["Splunk", "Elastic", "Datadog", "Chronicle"] },
  { icon: Workflow, title: "SOAR & automation", items: ["Tines", "Torq", "Cortex XSOAR"] },
  { icon: Bell, title: "Alerting & chatops", items: ["Slack", "PagerDuty", "Microsoft Teams"] },
  { icon: Cloud, title: "CI/CD & cloud", items: ["GitHub Actions", "GitLab CI", "Kubernetes", "AWS"] },
]

export function Integrations() {
  return (
    <Section id="integrations">
      <SectionHeading
        eyebrow="Integrations"
        title="Fits into the stack you already run"
        description="Stream findings and inventory into your existing detection, response, and delivery pipelines — no rip-and-replace required."
      />

      <Reveal>
        <IntegrationsRadar />
      </Reveal>

      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((group, i) => (
          <Reveal key={group.title} delay={(i % 4) * 70}>
            <div className="lift-card glass-panel h-full rounded-2xl border p-5">
              <span className="glass-chip flex size-10 items-center justify-center rounded-xl">
                <group.icon className="size-5 text-primary" />
              </span>
              <p className="mt-3 font-semibold">{group.title}</p>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Plug className="size-3.5 text-primary/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
