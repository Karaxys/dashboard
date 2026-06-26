import Image from "next/image"
import { cn } from "@/lib/utils"

const sizes = {
  default: { img: "size-8", text: "text-lg", px: 32 },
  lg:      { img: "size-11", text: "text-2xl", px: 44 },
} as const

export function Logo({
  className,
  size = "default",
}: {
  className?: string
  size?: keyof typeof sizes
}) {
  const s = sizes[size]
  return (
    <span className={cn("flex items-center gap-2.5 font-bold tracking-tight", className)}>
      <Image
        src="/karaxys_logo.png"
        alt="Karaxys"
        width={s.px}
        height={s.px}
        className={cn(s.img, "rounded-lg object-contain")}
        priority
      />
      <span className={cn(s.text, "text-amber-400")}>Karaxys</span>
    </span>
  )
}
