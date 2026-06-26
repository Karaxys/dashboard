import { cn } from "@/lib/utils"
import { Reveal } from "./reveal"

interface SectionProps {
  id?: string
  className?: string
  children: React.ReactNode
}

// Section wrapper that always gives a textured (non-flat) background.
export function Section({ id, className, children }: SectionProps) {
  return (
    <section
      id={id}
      className={cn("relative py-24", className)}
    >
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
