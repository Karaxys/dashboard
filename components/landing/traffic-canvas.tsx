"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface Node {
  x: number
  y: number
  vx: number
  vy: number
}

interface Packet {
  from: number
  to: number
  t: number
  speed: number
  hostile: boolean
}

// Animated network of drifting nodes with packets flowing along nearby links.
// Evokes Karaxys capturing live API traffic. Pauses for prefers-reduced-motion.
export function TrafficCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let width = 0
    let height = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let nodes: Node[] = []
    let packets: Packet[] = []
    let raf = 0

    const LINK_DIST = 170

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      width = parent.clientWidth
      height = parent.clientHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.max(22, Math.min(64, Math.round((width * height) / 16000)))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }))
      packets = []
    }

    const spawnPacket = () => {
      if (nodes.length < 2 || packets.length > 26) return
      const from = Math.floor(Math.random() * nodes.length)
      let to = from
      let best = Infinity
      for (let i = 0; i < nodes.length; i++) {
        if (i === from) continue
        const d = Math.hypot(nodes[i].x - nodes[from].x, nodes[i].y - nodes[from].y)
        if (d < best && d < LINK_DIST) {
          best = d
          to = i
        }
      }
      if (to === from) return
      packets.push({
        from,
        to,
        t: 0,
        speed: 0.006 + Math.random() * 0.01,
        hostile: Math.random() < 0.18,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > width) n.vx *= -1
        if (n.y < 0 || n.y > height) n.vy *= -1
      }

      // Links between nearby nodes.
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
          if (d < LINK_DIST) {
            ctx.strokeStyle = `rgba(148, 163, 184, ${0.16 * (1 - d / LINK_DIST)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Nodes.
      for (const n of nodes) {
        ctx.fillStyle = "rgba(148, 163, 184, 0.45)"
        ctx.beginPath()
        ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }

      // Packets travelling along links.
      packets = packets.filter((p) => p.t <= 1)
      for (const p of packets) {
        p.t += p.speed
        const a = nodes[p.from]
        const b = nodes[p.to]
        if (!a || !b) {
          p.t = 2
          continue
        }
        const x = a.x + (b.x - a.x) * p.t
        const y = a.y + (b.y - a.y) * p.t
        const color = p.hostile ? "245, 158, 11" : "56, 189, 248"
        ctx.shadowBlur = 10
        ctx.shadowColor = `rgba(${color}, 0.9)`
        ctx.fillStyle = `rgba(${color}, 0.95)`
        ctx.beginPath()
        ctx.arc(x, y, p.hostile ? 2.6 : 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      if (Math.random() < 0.4) spawnPacket()
      raf = requestAnimationFrame(draw)
    }

    resize()
    if (reduced) {
      draw()
      cancelAnimationFrame(raf)
    } else {
      draw()
    }

    const onResize = () => resize()
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className={cn("absolute inset-0 h-full w-full", className)} />
}
