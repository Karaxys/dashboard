import { cn } from "@/lib/utils"

interface BeamsProps {
  className?: string
  count?: number
}

// Light beams that streak horizontally across a section background.
export function Beams({ className, count = 6 }: BeamsProps) {
  const beams = Array.from({ length: count }, (_, i) => ({
    top: `${8 + (i * 84) / count + (i % 2 ? 4 : 0)}%`,
    dur: `${6 + (i % 4) * 1.6}s`,
    delay: `${(i * 1.3) % 6}s`,
    left: `${-20 + (i % 3) * 10}%`,
    amber: i % 3 === 0,
  }))
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {beams.map((b, i) => (
        <span
          key={i}
          className={cn("beam", b.amber && "beam-amber")}
          style={
            {
              top: b.top,
              left: b.left,
              "--beam-dur": b.dur,
              "--beam-delay": b.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
