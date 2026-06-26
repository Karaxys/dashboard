import Link from "next/link"
import { Github, Linkedin, Twitter } from "lucide-react"
import { Logo } from "./logo"

const columns = [
  {
    title: "Product",
    links: [
      { label: "API Discovery", href: "/#platform" },
      { label: "Data Classification", href: "/#platform" },
      { label: "Active Testing", href: "/#platform" },
      { label: "Integrations", href: "/#integrations" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Shadow API Discovery", href: "/#use-cases" },
      { label: "Pre-release Gates", href: "/#use-cases" },
      { label: "Data Governance", href: "/#use-cases" },
      { label: "Container & K8s", href: "/#platform" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/resources#blog" },
      { label: "Resource Library", href: "/resources#library" },
      { label: "Documentation", href: "/docs" },
      { label: "Changelog", href: "/docs#changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/resources#about" },
      { label: "Security", href: "/#security" },
      { label: "Careers", href: "/resources#careers" },
      { label: "Contact", href: "/resources#contact" },
    ],
  },
]

const socials = [
  { label: "GitHub", href: "#", icon: Github },
  { label: "LinkedIn", href: "#", icon: Linkedin },
  { label: "X", href: "#", icon: Twitter },
]

export function LandingFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Real-time API discovery and security testing powered by eBPF. See every API, secure the
              ones that matter.
            </p>
            <div className="mt-6 flex gap-3">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="glass-chip flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                >
                  <social.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold">{col.title}</p>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Karaxys. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="transition-colors hover:text-foreground">Terms</Link>
            <Link href="#" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link href="/#security" className="transition-colors hover:text-foreground">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
