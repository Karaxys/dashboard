import Image from "next/image"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <Image
        src="/karaxys_logo.png"
        alt="Karaxys"
        width={32}
        height={32}
        className="size-8 rounded-lg object-contain"
        priority
      />
      <span className="text-lg">Karaxys</span>
    </span>
  )
}
