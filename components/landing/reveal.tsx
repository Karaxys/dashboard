"use client"

import { cn } from "@/lib/utils"
import { useReveal } from "@/hooks/use-reveal"

export function Reveal({
  children,
  className,
  delay,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
