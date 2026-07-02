import Link from "next/link"
import { FaGithub, FaLinkedin, FaXTwitter } from "react-icons/fa6"
import { Logo } from "./logo"

const columns = [
  {
    title: "Product",
    links: [
      { label: "API Discovery",      href: "/#platform" },
      { label: "Active Testing",     href: "/#platform" },
      { label: "Integrations",       href: "/#integrations" },
      { label: "Dashboard",          href: "/dashboard" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation",      href: "/docs" },
      { label: "Blog",               href: "/blog" },
      { label: "Changelog",          href: "/docs#changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About",              href: "/resources#about" },
      { label: "Careers",            href: "/resources#careers" },
      { label: "Contact",            href: "/resources#contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy",            href: "#" },
      { label: "Terms",              href: "#" },
      { label: "Security",           href: "/docs/security" },
    ],
  },
]

const socials = [
  { label: "LinkedIn", href: "#", Icon: FaLinkedin },
  { label: "X",        href: "#", Icon: FaXTwitter },
  { label: "GitHub",   href: "#", Icon: FaGithub },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
          {/* Logo */}
          <div className="shrink-0">
            <Logo />
          </div>

          {/* Columns */}
          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-slate-100">{col.title}</p>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-800/60 pt-6 sm:flex-row">
          <p className="text-sm text-slate-600">
            © {new Date().getFullYear()} Karaxys. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            {socials.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="flex size-8 items-center justify-center rounded-full border border-slate-800 text-slate-500 transition-colors hover:border-slate-700 hover:text-slate-300"
              >
                <Icon className="size-3.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
