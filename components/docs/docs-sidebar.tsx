"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { docsNav } from "./docs-nav"

export function DocsSidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <nav className="sticky top-24 space-y-6">
        {docsNav.map((section) => (
          <div key={section.heading}>
            <p className="px-3 font-mono text-xs font-semibold uppercase tracking-widest text-slate-500">
              {section.heading}
            </p>
            <ul className="mt-2 space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-md px-3 py-1.5 font-mono text-[13px] transition-colors ${
                        active
                          ? "bg-amber-500/10 font-medium text-amber-400"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
