"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, Menu, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"

const docSections = [
  { title: "Introduction",   desc: "Get started with Karaxys in less than 15 minutes.",        href: "/docs" },
  { title: "API Discovery",  desc: "View all your endpoints, hosts, and sensitive data.",       href: "/docs#discovery" },
  { title: "Detection",      desc: "Detect and block API attacks and vulnerabilities.",          href: "/docs#detection" },
  { title: "Integrations",   desc: "Connect Karaxys with your existing pipelines.",             href: "/docs#integrations" },
  { title: "Active Testing", desc: "Test and catch API vulnerabilities with custom tests.",      href: "/docs#testing" },
  { title: "Settings",       desc: "Configure Karaxys to fit your security needs.",             href: "/docs#settings" },
]

function DocsDropdown() {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-slate-100"
        aria-expanded={open}
      >
        Docs
        <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
      </button>

      <div
        className={cn(
          "absolute left-0 top-full z-50 w-150 pt-3 transition-all duration-200",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
        )}
      >
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/60">
          <div className="flex">
            {/* Left panel */}
            <div className="w-52 shrink-0 bg-slate-800/50 p-6">
              <p className="text-sm font-semibold text-slate-100">karaxys / karaxys</p>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                Effortless API security — discover, monitor, and continuously test your entire API estate.
              </p>
            </div>

            {/* Right section grid */}
            <div className="flex-1 p-2">
              <div className="grid grid-cols-2 gap-0.5">
                {docSections.map((sec) => (
                  <Link
                    key={sec.title}
                    href={sec.href}
                    className="group rounded-lg p-4 transition-colors hover:bg-slate-800/70"
                  >
                    <p className="text-sm font-medium text-slate-200 transition-colors group-hover:text-amber-400">
                      {sec.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{sec.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-xl"
          : "border-b border-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Left: logo + nav links */}
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Karaxys home">
            <Logo />
          </Link>

          <div className="hidden items-center gap-6 lg:flex">
            <DocsDropdown />
            <Link
              href="/resources#blog"
              className="text-sm text-slate-400 transition-colors hover:text-slate-100"
            >
              Blog
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Right: stars + auth */}
        <div className="hidden items-center gap-3 lg:flex">
          {/* GitHub stars */}
          <a
            href="https://github.com/karaxys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800"
          >
            <Star className="size-3.5" />
            Stars
          </a>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-100"
          >
            <Link href="/login">Log in</Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="rounded-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
          >
            <Link href="/signup">Sign Up</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="flex size-9 items-center justify-center rounded-md text-slate-400 hover:text-slate-100 lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-800/60 bg-slate-950 px-4 pb-6 pt-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {[
              { label: "Docs",      href: "/docs" },
              { label: "Blog",      href: "/resources#blog" },
              { label: "Dashboard", href: "/dashboard" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Button asChild variant="outline" className="border-slate-700 text-slate-200">
              <Link href="/login" onClick={() => setMobileOpen(false)}>Log in</Link>
            </Button>
            <Button
              asChild
              className="rounded-full bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
            >
              <Link href="/signup" onClick={() => setMobileOpen(false)}>Sign Up</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
