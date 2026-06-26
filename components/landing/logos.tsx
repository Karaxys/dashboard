import { Reveal } from "./reveal"

// Placeholder wordmarks until real customer logos are available.
const logos = [
  "NorthBank",
  "Helix Health",
  "Veridian",
  "Corewave",
  "Quantis",
  "Aether Cloud",
  "Meridian",
  "Ironside",
]

export function Logos() {
  return (
    <section className="section-glow relative py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-center text-sm text-muted-foreground">
            Trusted by security and platform teams protecting modern API estates
          </p>
        </Reveal>
        <div className="marquee-track relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
          <div className="marquee gap-12">
            {[...logos, ...logos].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="whitespace-nowrap text-lg font-semibold tracking-tight text-muted-foreground/60"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
