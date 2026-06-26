import { cn } from "@/lib/utils"
import { Beams } from "./beams"
import { Reveal } from "./reveal"

interface SectionProps {
  id?: string
  className?: string
  children: React.ReactNode
  beams?: boolean
  lines?: boolean
}

// Section wrapper that always gives a textured (non-flat) background.
export function Section({ id, className, children, beams, lines }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "section-glow relative border-t border-white/5 py-24",
        lines && "section-lines",
        className
      )}
    >
      {beams && <Beams />}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 text-muted-foreground">{description}</p>
    </Reveal>
  )
}
