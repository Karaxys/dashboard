import { Reveal } from "./reveal"

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
    <section className="border-t border-slate-800/60 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-center text-sm text-slate-600">
            Trusted by security and platform teams protecting modern API estates
          </p>
        </Reveal>
        <div
          className="marquee-track relative mt-8 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
          }}
        >
          <div className="marquee gap-14">
            {[...logos, ...logos].map((name, i) => (
              <span
                key={`${name}-${i}`}
                className="whitespace-nowrap text-sm font-semibold tracking-wide text-slate-700"
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
