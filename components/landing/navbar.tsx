"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronDown, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { Logo } from "./logo"
import { navMenus, type NavMenu } from "./nav-data"

function DesktopMenu({ menu }: { menu: NavMenu }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        aria-expanded={open}
        onFocus={() => setOpen(true)}
      >
        {menu.label}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      <div
        className={cn(
          "absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 pt-3 transition-all duration-200",
          open ? "visible opacity-100 translate-y-0" : "invisible -translate-y-1 opacity-0"
        )}
      >
        <div className="glass-panel rounded-2xl border p-2 shadow-xl">
          {menu.items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5"
            >
              <span className="glass-chip mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                <item.icon className="size-4 text-primary" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">{item.label}</span>
                <span className="block text-xs text-muted-foreground">{item.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled ? "border-b border-white/10 bg-background/80 backdrop-blur-xl" : "border-b border-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Karaxys home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {navMenus.map((menu) => (
            <DesktopMenu key={menu.label} menu={menu} />
          ))}
          <Link href="/docs" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Docs
          </Link>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-3">
              {navMenus.map((menu) => (
                <Collapsible key={menu.label}>
                  <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                    {menu.label}
                    <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-3">
                    {menu.items.map((item) => (
                      <SheetClose asChild key={item.label}>
                        <Link
                          href={item.href}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <item.icon className="size-4 text-primary" />
                          {item.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
              <SheetClose asChild>
                <Link href="/docs" className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent">
                  Docs
                </Link>
              </SheetClose>
            </div>
            <div className="mt-auto flex flex-col gap-2 p-4">
              <SheetClose asChild>
                <Button asChild variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild>
                  <Link href="/signup">Get started</Link>
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}
