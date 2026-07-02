export interface DocNavItem {
  label: string
  href: string
}

export interface DocNavSection {
  heading: string
  items: DocNavItem[]
}

export const docsNav: DocNavSection[] = [
  {
    heading: "Introduction",
    items: [
      { label: "Overview", href: "/docs" },
      { label: "Core concepts", href: "/docs/concepts" },
      { label: "Architecture", href: "/docs/architecture" },
    ],
  },
  {
    heading: "Get started",
    items: [
      { label: "Quick start", href: "/docs/getting-started" },
    ],
  },
  {
    heading: "Traffic capture",
    items: [
      { label: "eBPF capture agent", href: "/docs/ebpf-agent" },
      { label: "API inventory", href: "/docs/inventory" },
    ],
  },
  {
    heading: "Active testing",
    items: [
      { label: "Scanner engine", href: "/docs/scanner" },
    ],
  },
  {
    heading: "Platform",
    items: [
      { label: "Security & privacy", href: "/docs/security" },
      { label: "API reference", href: "/docs/api-reference" },
    ],
  },
]
